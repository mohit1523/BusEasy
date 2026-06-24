import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "./Layout";

function readStorageValue(storageKey, fallback) {
  if (!storageKey || typeof window === "undefined") {
    return fallback;
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey);
    return rawValue ? JSON.parse(rawValue) : fallback;
  } catch (_error) {
    return fallback;
  }
}

function writeStorageValue(storageKey, value) {
  if (!storageKey || typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
  } catch (_error) {
    // Ignore storage failures so the workspace still functions.
  }
}

function getValueAtPath(record, path) {
  return path.split(".").reduce((current, key) => current?.[key], record);
}

function normalizeValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim().toLowerCase();
  }

  return String(value).toLowerCase();
}

function buildEmptyFilters(filters) {
  return filters.reduce((state, filter) => {
    if (filter.type === "numberRange" || filter.type === "dateRange") {
      state[`${filter.key}Min`] = "";
      state[`${filter.key}Max`] = "";
      return state;
    }

    state[filter.key] = "";
    return state;
  }, {});
}

function getFilterOptions(filter, records) {
  if (typeof filter.getOptions === "function") {
    return filter.getOptions(records);
  }

  return filter.options || [];
}

function isFilterActive(filter, appliedFilters) {
  if (filter.type === "numberRange" || filter.type === "dateRange") {
    return Boolean(appliedFilters[`${filter.key}Min`] || appliedFilters[`${filter.key}Max`]);
  }

  return Boolean(appliedFilters[filter.key]);
}

function getFilterSummary(filter, appliedFilters) {
  if (filter.type === "numberRange" || filter.type === "dateRange") {
    const minValue = appliedFilters[`${filter.key}Min`];
    const maxValue = appliedFilters[`${filter.key}Max`];
    if (!minValue && !maxValue) {
      return "";
    }

    return `${filter.label}: ${minValue || "Any"} - ${maxValue || "Any"}`;
  }

  return appliedFilters[filter.key] ? `${filter.label}: ${appliedFilters[filter.key]}` : "";
}

function filterRecord(record, filters, appliedFilters) {
  return filters.every((filter) => {
    if (filter.type === "select") {
      const activeValue = appliedFilters[filter.key];
      if (!activeValue) {
        return true;
      }

      return normalizeValue(filter.getValue(record)) === normalizeValue(activeValue);
    }

    if (filter.type === "numberRange") {
      const rawValue = filter.getValue(record);
      const numericValue = Number(rawValue);
      const minValue = appliedFilters[`${filter.key}Min`];
      const maxValue = appliedFilters[`${filter.key}Max`];

      if (minValue !== "" && numericValue < Number(minValue)) {
        return false;
      }

      if (maxValue !== "" && numericValue > Number(maxValue)) {
        return false;
      }

      return true;
    }

    if (filter.type === "dateRange") {
      const rawValue = filter.getValue(record);
      const minValue = appliedFilters[`${filter.key}Min`];
      const maxValue = appliedFilters[`${filter.key}Max`];

      if (minValue && rawValue < minValue) {
        return false;
      }

      if (maxValue && rawValue > maxValue) {
        return false;
      }

      return true;
    }

    return true;
  });
}

function sortRecords(records, columns, sortState) {
  const column = columns.find((item) => item.key === sortState.key);
  if (!column) {
    return records;
  }

  const multiplier = sortState.direction === "asc" ? 1 : -1;

  return [...records].sort((left, right) => {
    const leftValue = column.sortValue ? column.sortValue(left) : getValueAtPath(left, column.key);
    const rightValue = column.sortValue ? column.sortValue(right) : getValueAtPath(right, column.key);

    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return (leftValue - rightValue) * multiplier;
    }

    return normalizeValue(leftValue).localeCompare(normalizeValue(rightValue)) * multiplier;
  });
}

function StatusBadge({ value }) {
  return <span className={`status-badge status-${normalizeValue(value).replace(/\s+/g, "-")}`}>{value}</span>;
}

function EntityFilterBar({
  filters,
  records,
  draftFilters,
  appliedFilters,
  onChange,
  onApply,
  onReset,
  onRefresh,
  appliedCount,
}) {
  const activeSummaries = filters.map((filter) => getFilterSummary(filter, appliedFilters)).filter(Boolean);

  return (
    <div className="filter-shell">
      <div className="filter-grid">
        {filters.map((filter) => {
          const options = getFilterOptions(filter, records);

          if (filter.type === "select") {
            return (
              <label key={filter.key} className="filter-field">
                <span>{filter.label}</span>
                <select value={draftFilters[filter.key]} onChange={(event) => onChange(filter.key, event.target.value)}>
                  <option value="">All</option>
                  {options.map((option) => {
                    const optionValue = typeof option === "string" ? option : option.value;
                    const optionLabel = typeof option === "string" ? option : option.label;
                    return (
                      <option key={optionValue} value={optionValue}>
                        {optionLabel}
                      </option>
                    );
                  })}
                </select>
              </label>
            );
          }

          if (filter.type === "numberRange") {
            return (
              <div key={filter.key} className="filter-range">
                <span>{filter.label}</span>
                <div className="range-inputs">
                  <input
                    type="number"
                    min="0"
                    placeholder="Min"
                    value={draftFilters[`${filter.key}Min`]}
                    onChange={(event) => onChange(`${filter.key}Min`, event.target.value)}
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Max"
                    value={draftFilters[`${filter.key}Max`]}
                    onChange={(event) => onChange(`${filter.key}Max`, event.target.value)}
                  />
                </div>
              </div>
            );
          }

          if (filter.type === "dateRange") {
            return (
              <div key={filter.key} className="filter-range">
                <span>{filter.label}</span>
                <div className="range-inputs">
                  <input
                    type="date"
                    value={draftFilters[`${filter.key}Min`]}
                    onChange={(event) => onChange(`${filter.key}Min`, event.target.value)}
                  />
                  <input
                    type="date"
                    value={draftFilters[`${filter.key}Max`]}
                    onChange={(event) => onChange(`${filter.key}Max`, event.target.value)}
                  />
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>

      <div className="filter-actions">
        <p className="filter-status">
          {appliedCount ? `${appliedCount} filter${appliedCount > 1 ? "s" : ""} applied` : "Showing all rows"}
        </p>
        <div className="card-actions filter-actions-group">
          {onRefresh ? (
            <button type="button" className="ghost-button" onClick={onRefresh}>
              Refresh
            </button>
          ) : null}
          <button type="button" className="ghost-button" onClick={onReset}>
            Reset
          </button>
          <button type="button" className="primary-button" onClick={onApply}>
            Apply
          </button>
        </div>
      </div>

      {activeSummaries.length ? (
        <div className="active-filter-list">
          {activeSummaries.map((summary) => (
            <span key={summary}>{summary}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function EntityWorkspace({
  title,
  description,
  records,
  filters,
  columns,
  isLoading,
  error,
  onRefresh,
  detailTitle,
  renderDetail,
  getRowId,
  initialSort,
  storageKey,
  variant = "default",
}) {
  const emptyFilters = useMemo(() => buildEmptyFilters(filters), [filters]);
  const [draftFilters, setDraftFilters] = useState(() =>
    readStorageValue(storageKey ? `${storageKey}:draftFilters` : "", emptyFilters)
  );
  const [appliedFilters, setAppliedFilters] = useState(() =>
    readStorageValue(storageKey ? `${storageKey}:appliedFilters` : "", emptyFilters)
  );
  const [sortState, setSortState] = useState(() =>
    readStorageValue(storageKey ? `${storageKey}:sortState` : "", initialSort || { key: columns[0]?.key, direction: "asc" })
  );
  const [selectedRowId, setSelectedRowId] = useState(() =>
    readStorageValue(storageKey ? `${storageKey}:selectedRowId` : "", "")
  );

  const filteredRecords = useMemo(
    () => records.filter((record) => filterRecord(record, filters, appliedFilters)),
    [records, filters, appliedFilters]
  );

  const sortedRecords = useMemo(
    () => sortRecords(filteredRecords, columns, sortState),
    [filteredRecords, columns, sortState]
  );

  const selectedRecord = sortedRecords.find((record) => String(getRowId(record)) === String(selectedRowId)) || null;
  const appliedCount = filters.filter((filter) => isFilterActive(filter, appliedFilters)).length;
  const activeSummaries = filters.map((filter) => getFilterSummary(filter, appliedFilters)).filter(Boolean);

  useEffect(() => {
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  }, [emptyFilters]);

  useEffect(() => {
    if (!storageKey) {
      return;
    }

    writeStorageValue(`${storageKey}:draftFilters`, draftFilters);
  }, [draftFilters, storageKey]);

  useEffect(() => {
    if (!storageKey) {
      return;
    }

    writeStorageValue(`${storageKey}:appliedFilters`, appliedFilters);
  }, [appliedFilters, storageKey]);

  useEffect(() => {
    if (!storageKey) {
      return;
    }

    writeStorageValue(`${storageKey}:sortState`, sortState);
  }, [sortState, storageKey]);

  useEffect(() => {
    if (!storageKey) {
      return;
    }

    writeStorageValue(`${storageKey}:selectedRowId`, selectedRowId);
  }, [selectedRowId, storageKey]);

  useEffect(() => {
    if (!sortedRecords.length) {
      setSelectedRowId("");
      return;
    }

    const hasCurrent = sortedRecords.some((record) => String(getRowId(record)) === String(selectedRowId));
    if (!hasCurrent) {
      setSelectedRowId(String(getRowId(sortedRecords[0])));
    }
  }, [sortedRecords, selectedRowId, getRowId]);

  const handleSort = (key) => {
    setSortState((current) => {
      if (current.key === key) {
        return { key, direction: current.direction === "asc" ? "desc" : "asc" };
      }

      return { key, direction: "asc" };
    });
  };

  if (variant === "plain") {
    return (
      <div className="stack">
        <header className="page-header compact-page-header">
          <div>
            <span className="eyebrow">Operations</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        </header>

        <div className="operator-toolbar filter-shell">
          <div className="filter-grid compact-filter-grid">
            {filters.map((filter) => {
              const options = getFilterOptions(filter, records);

              if (filter.type === "select") {
                return (
                  <label key={filter.key} className="filter-field">
                    <span>{filter.label}</span>
                    <select
                      value={draftFilters[filter.key]}
                      onChange={(event) => setDraftFilters((current) => ({ ...current, [filter.key]: event.target.value }))}
                    >
                      <option value="">{`All ${filter.label.toLowerCase()}`}</option>
                      {options.map((option) => {
                        const optionValue = typeof option === "string" ? option : option.value;
                        const optionLabel = typeof option === "string" ? option : option.label;
                        return (
                          <option key={optionValue} value={optionValue}>
                            {optionLabel}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                );
              }

              if (filter.type === "numberRange") {
                return (
                  <div key={filter.key} className="filter-range">
                    <span>{filter.label}</span>
                    <div className="range-inputs">
                      <input
                        type="number"
                        min="0"
                        placeholder="Min"
                        value={draftFilters[`${filter.key}Min`]}
                        onChange={(event) =>
                          setDraftFilters((current) => ({ ...current, [`${filter.key}Min`]: event.target.value }))
                        }
                      />
                      <input
                        type="number"
                        min="0"
                        placeholder="Max"
                        value={draftFilters[`${filter.key}Max`]}
                        onChange={(event) =>
                          setDraftFilters((current) => ({ ...current, [`${filter.key}Max`]: event.target.value }))
                        }
                      />
                    </div>
                  </div>
                );
              }

              if (filter.type === "dateRange") {
                return (
                  <div key={filter.key} className="filter-range">
                    <span>{filter.label}</span>
                    <div className="range-inputs">
                      <input
                        type="date"
                        value={draftFilters[`${filter.key}Min`]}
                        onChange={(event) =>
                          setDraftFilters((current) => ({ ...current, [`${filter.key}Min`]: event.target.value }))
                        }
                      />
                      <input
                        type="date"
                        value={draftFilters[`${filter.key}Max`]}
                        onChange={(event) =>
                          setDraftFilters((current) => ({ ...current, [`${filter.key}Max`]: event.target.value }))
                        }
                      />
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>

          <div className="filter-actions operator-toolbar-actions">
            <p className="filter-status">{appliedCount ? `${appliedCount} filters applied` : "Showing all rows"}</p>
            <div className="card-actions filter-actions-group">
              <button type="button" className="ghost-button" onClick={onRefresh}>
                Refresh
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setDraftFilters(emptyFilters);
                  setAppliedFilters(emptyFilters);
                }}
              >
                Reset
              </button>
              <button type="button" className="primary-button" onClick={() => setAppliedFilters(draftFilters)}>
                Apply
              </button>
            </div>
          </div>
        </div>

        {error ? <p className="error-text">{error}</p> : null}
        {activeSummaries.length ? (
          <div className="active-filter-list">
            {activeSummaries.map((summary) => (
              <span key={summary}>
                {summary}
              </span>
            ))}
          </div>
        ) : null}
        {isLoading ? <div className="workspace-surface"><p className="muted-copy">Loading rows...</p></div> : null}
        {!isLoading && !sortedRecords.length ? (
          <div className="workspace-surface"><p className="muted-copy">No rows match the current filters.</p></div>
        ) : null}
        {!isLoading && sortedRecords.length ? (
          <div className="operator-table-layout">
            <div className="table-shell workspace-table-shell">
              <table className="data-table operator-table">
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th key={column.key}>
                        <button
                          type="button"
                          className={`table-sort ${sortState.key === column.key ? "active" : ""}`}
                          onClick={() => handleSort(column.key)}
                          disabled={column.sortable === false}
                        >
                          {column.label}
                          {column.sortable === false ? null : (
                            <span>{sortState.key === column.key ? (sortState.direction === "asc" ? "↑" : "↓") : "↕"}</span>
                          )}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedRecords.map((record) => (
                    <tr
                      key={getRowId(record)}
                      className={String(getRowId(record)) === String(selectedRowId) ? "selected-row" : ""}
                      onClick={() => setSelectedRowId(String(getRowId(record)))}
                    >
                      {columns.map((column) => (
                        <td key={`${getRowId(record)}-${column.key}`}>
                          {column.render ? column.render(record) : getValueAtPath(record, column.key)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedRecord ? (
              <section className="workspace-pane">
                <div className="workspace-pane-header">
                  <h2>{detailTitle}</h2>
                  <span>Selected row</span>
                </div>
                {renderDetail(selectedRecord)}
              </section>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Entity workspace</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </header>

      <SectionCard
        title="Filter rows"
        description="Use one or more filters, then apply them together. Rows update only after you confirm the filter set."
      >
        <EntityFilterBar
          filters={filters}
          records={records}
          draftFilters={draftFilters}
          appliedFilters={appliedFilters}
          appliedCount={appliedCount}
          onRefresh={onRefresh}
          onChange={(key, value) => setDraftFilters((current) => ({ ...current, [key]: value }))}
          onApply={() => setAppliedFilters(draftFilters)}
          onReset={() => {
            setDraftFilters(emptyFilters);
            setAppliedFilters(emptyFilters);
          }}
        />
      </SectionCard>

      <SectionCard
        title="Rows"
        description={`${sortedRecords.length} result${sortedRecords.length === 1 ? "" : "s"} in the current view.`}
      >
        {error ? <p className="error-text">{error}</p> : null}
        {isLoading ? <div className="empty-state">Loading rows...</div> : null}
        {!isLoading && !sortedRecords.length ? (
          <div className="empty-state">No rows match the current filters.</div>
        ) : null}
        {!isLoading && sortedRecords.length ? (
          <div className="entity-workspace-grid">
            <div className="table-shell entity-table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th key={column.key}>
                        <button
                          type="button"
                          className={`table-sort ${sortState.key === column.key ? "active" : ""}`}
                          onClick={() => handleSort(column.key)}
                          disabled={column.sortable === false}
                        >
                          {column.label}
                          {column.sortable === false ? null : (
                            <span>{sortState.key === column.key ? (sortState.direction === "asc" ? "↑" : "↓") : "↕"}</span>
                          )}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedRecords.map((record) => (
                    <tr
                      key={getRowId(record)}
                      className={String(getRowId(record)) === String(selectedRowId) ? "selected-row" : ""}
                      onClick={() => setSelectedRowId(String(getRowId(record)))}
                    >
                      {columns.map((column) => (
                        <td key={`${getRowId(record)}-${column.key}`}>
                          {column.render ? column.render(record) : getValueAtPath(record, column.key)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedRecord ? (
              <aside className="detail-panel">
                <div className="section-header">
                  <div>
                    <h2>{detailTitle}</h2>
                    <p>Selected row details update when you click a record.</p>
                  </div>
                </div>
                {renderDetail(selectedRecord)}
              </aside>
            ) : null}
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}

export { StatusBadge };

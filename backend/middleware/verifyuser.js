const jwt = require("jsonwebtoken");
const privateKey = "Mohit1502@#";

const verifyUser = (req , res , next) => {
    try {
        let token = req.header('auth-token');
        if(!token){
            res.status(401).send("Invalid token");
        }
        const payload = jwt.verify(token , privateKey);
        req.userId = payload.userId;
        next();
    } catch (error) {
        res.status(401).send("Invalid token");
        console.error(error);
    }
}

module.exports = verifyUser;
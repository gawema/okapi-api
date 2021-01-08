require('dotenv/config')
const jsonwebtoken = require('jsonwebtoken');

secretkey = process.env.TOKEN_SECRET_KEY

// VERIFY TOKEN
function verifyToken(req, res, next) {
	const bearer = req.headers['authorization'];
	if (typeof bearer !== 'undefined' && bearer.includes(' ')) {
		const token = bearer.split(' ')[1]
		//!IMPORTANT: CHANGE SECRET KEY TO MORE ROBUST ONE
		jsonwebtoken.verify(token, secretkey, (err, user) => {
			if (err) {
				res.sendStatus(403)
			}
			res.locals.userPayload = user.payload
		})
	}else{
		res.sendStatus(403);
	}
	return next();
}

// GENERATE TOKEN
function generateToken(payload) {
	const token = jsonwebtoken.sign({ payload }, secretkey)
	return token;
}


module.exports = {
	verifyToken,
	generateToken
}
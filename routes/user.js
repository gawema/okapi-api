const router = require("express").Router();
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const tokenizer = require('../utils/tokenizer');
const logger = require('../utils/logger');
const User = require("../models/User");


//SIGN UP
router.post('/signup', async (req, res) => {
	try {
		User.findOne({ email: req.body.email }, async (err, result) => {
			if (result !== null) {
				return res.status(500).send("User already exists!");
			}
			const salt = await bcrypt.genSalt();
			const hashPassword = await bcrypt.hash(req.body.password, salt)
			const userId = new mongoose.Types.ObjectId();
			const user = new User({
				_id: userId,
				email: req.body.email,
				password: hashPassword,
				projects: []
			});
			user.save()
				.then(result => {
					const token = tokenizer.generateToken(user);
					return res.json({
						user_id: result._id,
						user_email: result.email,
						token: token,
					})
				})
				.catch(error => {
					return res.sendStatus(500)
				});
		});
	} catch (error) {
		return res.sendStatus(500)
	}
})

//LOGIN
router.post('/login', async (req, res) => {
	try {
		User.findOne({ 'email': req.body.email }, async (err, user) => {
			try {
				if (await bcrypt.compare(req.body.password, user.password)) {
					const token = tokenizer.generateToken(user);
					return res.json({
						user_id: user._id,
						user_email: user.email,
						token: token,
					})
				}
				return res.sendStatus(400)
			} catch (error) {
				return res.sendStatus(500)
			}
		});
	} catch (error) {
		return res.sendStatus(500)
	}
})

// ------------------------------- TESTING ROUTES -------------------------------

// EDIT USERS - TESTING ONLY
router.patch('/', tokenizer.verifyToken, async (req, res) => {
	const user = await tokenizer.getUserByToken(req);
	const id = new require('mongodb').ObjectID(user._id);
	const newUser = req.body;
	delete newUser.email
	delete newUser.password
	User.updateOne({ '_id': id }, { $set: newUser }, (err, dbres) => {
		if (err) { console.log(err); return; }
		res.send(dbres);
	});
})

// DELETE USERS - TESTING ONLY
router.delete('/', tokenizer.verifyToken, async (req, res) => {
	const user = await tokenizer.getUserByToken(req);
	const id = new require('mongodb').ObjectID(user._id);
	User.deleteOne({ '_id': id }, (err, dbres) => {
		res.send(dbres)
		console.log(dbres);
	})
})

// SPECIFIC USERS - TESTING ONLY
router.get('/:userId', tokenizer.verifyToken, (req, res) => {
	const id = new require('mongodb').ObjectID(req.params.userId);
	User.findOne({ '_id': id }, (err, dbres) => {
		res.send(dbres)
	})
})

// ALL USERS - TESTING ONLY
router.get('/', (req, res) => {
	User.find((err, users) => {
		if (err) { console.log(err); return }
		res.send(users)
	});
})

module.exports = router
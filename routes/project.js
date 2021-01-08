const router = require("express").Router();
const tokenizer = require('../utils/tokenizer');
const mongoose = require("mongoose");
const multer = require('multer');
const aws = require('../utils/aws');
const logger = require('../utils/logger');
const User = require("../models/User");

const upload = multer()
const AWS = require('aws-sdk')
require('dotenv/config')


const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET
})

router.post('/', tokenizer.verifyToken, upload.single('file'), async (req, res, next) => {
	try{
		const userId = new require('mongodb').ObjectID(res.locals.userPayload._id);
		const user = await User.findById(userId);
		if(!user) throw 'User not found';
		const newProjectId = new mongoose.Types.ObjectId();
		const fileName = req.file.originalname
		let projectPagesPath = []
		const projectPages = []
		// UPLOAD
		aws.uploadToS3(userId, newProjectId, fileName, req.file.buffer)
		.then(async data => {
			if (data['Key'] != userId+"/"+newProjectId+"/"+fileName){
				logger.logError("Upload went wrong")
				return res.sendStatus(500)
			}
			// IF ZIP
			if (req.file.mimetype == "application/zip"){
				const zippingResult = await aws.unzipProject(userId, newProjectId, fileName)
				if (zippingResult.statusCode == 200) {
					const findPagesResult = await aws.findPagesInProject(userId, newProjectId)
					findPagesResult.Contents.forEach(content =>{
						if(content['Key'].endsWith('.html')){
							projectPagesPath.push(content['Key'])
						}
					})
				}else {
					logger.logError(zippingResult)
					return res.sendStatus(500)
				}
			}
			// IF HTML
			else if (req.file.mimetype == "text/html"){
				projectPagesPath.push(userId+"/"+newProjectId+"/"+ fileName)
			}

			for (path of projectPagesPath){
				const jsonConvertionResult = await aws.getJsonFromPage(path)
				if (jsonConvertionResult.statusCode != 200) {
					logger.logError(jsonConvertionResult)
					return res.sendStatus(500)
				}
				projectPages.push({
					_id: new mongoose.Types.ObjectId(),
					name: path.split('/').pop(),
					path: path,
					components: jsonConvertionResult.body.data
				})
			}
			const newProject = {
				_id: newProjectId,
				name: fileName.split('.')[0],
				pages: projectPages
			}
			user.projects.push(newProject);
			await user.save()
			return res.status(200).send({
				message: "project uploaded with success",
				data: newProject,
			})

		}).catch(error=>{
			logger.logError(error)
			return res.sendStatus(500)
		})
	} catch (error) {
		logger.logError(error)
		return res.sendStatus(500)
	}

});


// UPDATE PROJECTS
router.patch('/', tokenizer.verifyToken, async (req, res) => {
	try {
		const userId = new require('mongodb').ObjectID(res.locals.userPayload._id);
		User.findOneAndUpdate(
			{ _id: userId, "projects._id": req.body['_id'] },
			{ $set: { "projects.$": req.body } }
		).exec().then(data => {
			if(data !== null){
				return res.sendStatus(200)
			}else{
				return res.sendStatus(404)
			}
		}).catch(error => {
			throw new Error(error);
		})

		// res.sendStatus(404)
		//or update only a page
		// user.projects.forEach(project => {
		// 	if(project._id == projectId){
		// 		User.findOneAndUpdate(
		// 			{_id: userId, "projects._id": projectId },
		// 			{$set: {"projects.$[].pages.$[page].name" : 'TEST'}},
		// 			{arrayFilters: [{'page._id': '1'}]}
		// 		).exec().then(
		// 			res.status(200).send('found')
		// 		)
		// 	}
		// })

	} catch (error) {
		logger.logError(error)
		return res.sendStatus(500)
	}
})

// DOWNLOAD UPDATED PROJECT
router.post('/download', tokenizer.verifyToken, upload.single('file'), async (req, res, next) => {
	try {
		const userId = new require('mongodb').ObjectID(res.locals.userPayload._id);
		const lambdaResponse = await aws.getPagefromJson(userId, req.body.projectId, req.body.fileName, req.body.pages)
		if (lambdaResponse.data.statusCode === 200) {
			const zipLocation = await aws.zipProject(userId, req.body.projectId, req.body.fileName)
			return res.status(200).send(zipLocation)
		} else {
			throw new Error('file downlooad whent wrong');
		}
	} catch (error) {
		logger.logError(error)
		return res.sendStatus(500)
	}
})

// GET ALL PROJECTS BY USER
router.get('/', tokenizer.verifyToken, async (req, res) => {
	try {
		// GET THE USER FROM THE TOKEN
		const userPayload = res.locals.userPayload
		// GET THE USER ID
		const userId = new require('mongodb').ObjectID(userPayload._id);
		// GET THE ACTUAL USER OBJECT FROM THE DB
		const user = await User.findById(userId);
		// INITIALIZING EMPTY ARRAY OF POSTS
		let projects = [];
		user.projects.forEach(project => {
			projects.push(project);
		})
		return res.send(projects);
	} catch (error) {
		logger.logError(error)
		return res.sendStatus(500)
	}

})

// GET SPECIFIC PROJEC BY USER
router.get('/:project', tokenizer.verifyToken, async (req, res) => {
	try {
		// GET THE USER FROM THE TOKEN
		const userPayload = res.locals.userPayload
		// GET THE USER ID
		const userId = new require('mongodb').ObjectID(userPayload._id);
		// GET THE ACTUAL USER OBJECT FROM THE DB
		const user = await User.findById(userId);
		let foundProject = undefined;
		// GET THE PROJECT FROM DB
		user.projects.forEach(project => {
			if (project._id == req.params.project) {
				foundProject = project;
			}
		})
		if(foundProject !== undefined){
			return res.send(foundProject);
		}else{
			throw new Error('project not found');
		}

	} catch (error) {
		logger.logError(error)
		return res.sendStatus(500)
	}

})

// DELETE A PROJECT
router.delete('/:projectId', tokenizer.verifyToken, async (req, res) => {
	try {
		// GET THE USER FROM THE TOKEN
		const userPayload = res.locals.userPayload
		// GET THE USER ID
		const userId = new require('mongodb').ObjectID(userPayload._id);
		// GET THE ProjectID
		const projectId = new require('mongodb').ObjectID(req.params.projectId);
		// FIND THE POST TO DELETE
		User.findOne({ '_id': userId, 'projects._id': projectId }, (err, user) => {
			if (!user) { 
				return res.sendStatus(404); 
			}
			if (err) { 
				throw new Error(err);
			}
			user.projects.forEach(project => {
				if (project._id.equals(projectId)) {
					// DELETE POST
					user.projects.remove(project);
					user.save().then(() => {
						res.sendStatus(200)
					})
				}
			})
		});
	} catch (error) {
		logger.logError(error)
		return res.sendStatus(500)
	}
})

module.exports = router
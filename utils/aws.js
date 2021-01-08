require('dotenv/config')
const axios = require('axios');
const AWS = require('aws-sdk');
const S3Zipper = require ('./aws-s3-zipper');
const logger = require('./logger');

const s3_bucket = process.env.AWS_BUCKET_NAME;
const zipper = new S3Zipper({
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET,
    region: process.env.AWS_REGION,
    bucket: process.env.AWS_BUCKET_NAME
});

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET
})

const unzipProjectApi = process.env.LAMBDA_UNZIP
const htmlToJsonApi = process.env.LAMBDA_HTML_TO_JSON
const jsonToHtmlApi = process.env.LAMBDA_JSON_TO_HTML

//uses aws-sdk
const uploadToS3 = (userId, projectId, fileName, fileBuffer) => {
    return new Promise((resolve, reject) => {
		const key = userId+"/"+projectId+"/"+fileName
		const params = {
			Bucket: s3_bucket,
			Key: key,
			Body: fileBuffer
		}
		s3.upload(params, async (error, data) => {
			if(error){
				return reject(error);
			}
			if (data) {
				logger.logSuccess(data, "uploadToS3")
                return resolve(data);
            }	
		})
    });
}

//uses lambda function
const unzipProject =  async (userId, projectId, fileName) =>{
	const config = {
		headers: {'Content-Type': 'application/json' },
	};
	const body = {
		bucket: s3_bucket,
		user_id: userId,
		project_id: projectId,
		file_name: fileName
	}
	const result = await axios.post(unzipProjectApi, body ,config)
	if(result['data']['statusCode'] == 200){
		logger.logSuccess(result['data'], "unzipProject")
	}
	return result['data']
}

//uses aws-sdk
const findPagesInProject = async (userId, projectId) => {
	return new Promise((resolve, reject) => {
		const prefix = userId + '/' + projectId
		const opts = { Bucket: s3_bucket, Prefix: prefix }
		s3.listObjectsV2(opts, function(error, data){
			if(error){
				return reject(error);
			}
			if (data) {
				logger.logSuccess(data, "findPagesInProject")
				return resolve(data);
			}
		})
	});
}

//uses lambda function
const getJsonFromPage = async (filePath) =>{
	const config = {
		headers: {'Content-Type': 'text/html' },
	};
	const body = {
		bucket: s3_bucket,
		html_filter: "editable",
		file_path: filePath
	}
	const result = await axios.post(htmlToJsonApi, body ,config)
	if(result['data']['statusCode'] == 200){
		logger.logSuccess(result['data'], "getJsonFromPage "+ filePath.split("/").slice(-1))
	}
	return result['data']
}

//uses lambda function
const getPagefromJson = async(userId, projectId, fileName, pages) => {
	const config = {
		headers: {'Content-Type': 'application/json' },
	};
	const body = {
		bucket: s3_bucket,
		html_filter: "editable",
		user: userId,
		project: projectId,
		file: fileName,
		pages: pages
	}
	const result = await axios.post(jsonToHtmlApi, body ,config)
	if(result['data']['statusCode'] == 200){
		logger.logSuccess(result['data'], "getPagefromJson")
	}
	return result
}

//uses aws-s3-zipper
const zipProject =  async (userId, projectId, fileName) =>{
	return new Promise((resolve, reject) => {
		zipper.zipToS3File ({
			s3FolderName: userId + '/' + projectId + '/' + fileName,
			s3ZipFileName: userId + '/' + projectId + '/' + fileName + '.zip'
		},function(error,data){
			if(error)
				return reject(error);
			if (data) {
				logger.logSuccess(data, "zipProject")
				return resolve(data);
			}
		});
	})
}

module.exports = {
	uploadToS3,
	unzipProject,
	findPagesInProject,
	getJsonFromPage,
	getPagefromJson,
	zipProject
}

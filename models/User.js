const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');

	const attributeSchema = mongoose.Schema(
		{
			value: String,
			text: String
		}
	)

	const componentSchema = mongoose.Schema({
		_id: { type: ObjectId, default: new mongoose.Types.ObjectId()},
		name: String,
		text: String,
		attributes: {},
		child_components: [this]
	})

	const pageSchema = mongoose.Schema({
		_id: { type: ObjectId, default: new mongoose.Types.ObjectId()},
		name: String,
		path: String,
		components: [componentSchema]
	})

	const projectSchema = mongoose.Schema({
		_id: { type: ObjectId, default: new mongoose.Types.ObjectId()},
		name: String,
		last_update: { type: Date, default: Date.now },
		folder_url: String,
		pages:[pageSchema]
	});

const userSchema = mongoose.Schema({
	_id: { type: ObjectId, default: new mongoose.Types.ObjectId()},
	email: String,
	password: String,
	projects: [projectSchema],
});

module.exports = mongoose.model('User', userSchema);

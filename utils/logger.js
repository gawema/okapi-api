
function logError(error) {
	console.log('\n=========ERROR===========')
	if (typeof error === 'object') {
	  if (error.message) {
		console.log('\nMessage: ' + error.message)
	  }
	  else{
		console.log("\nERROR OBJECT")
		console.log(error)				
	  }
	} else {
	  console.log(error);
	}
	console.log('\n=========================')
  }

  function logSuccess(data, fucntion_name) {
	console.log(`\n=========${fucntion_name} SUCCEDED===========`)
	console.log("\nDATA:")
	console.log(data)
	console.log(`\n===========================================`)
  }


module.exports = {
	logError,
	logSuccess
}
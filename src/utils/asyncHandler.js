
// higher order function that takes req, res and next and process that
const asyncHandler = (requestHandler) => {
    (req, res, next) => {
        Promise
        .resolve(requestHandler(req, res, next))
        .catch((error) => next(error))
    }
}



/* Another way of doing this.
const asyncHandler = (fn) => async (req, res, next) => {
    try {
        await fn(req, res, next)
    }
    catch(error) {
        res.status(error.code).json({
            success: false,
            message: error.message
        })
    }
}
*/    

export default asyncHandler;
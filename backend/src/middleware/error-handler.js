export const errorHandler = (err, req, res, next) => {
  console.log("Error in request:", err.message);

  return res.status(err.status || 500).json({
    status: false,
    message: err.message || "Something went wrong try again later",
  });
};

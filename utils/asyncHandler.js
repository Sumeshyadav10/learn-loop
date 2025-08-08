const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => {
      // Always log the error for debugging
      console.error("AsyncHandler caught error:", err);

      // Use next if it's available and is a function
      if (typeof next === "function") {
        return next(err);
      }

      // Fallback: try to send error response if res is available
      if (res && typeof res.status === "function") {
        return res.status(500).json({
          success: false,
          message: "Internal Server Error",
          error:
            process.env.NODE_ENV === "development"
              ? err.message
              : "Something went wrong",
        });
      }

      // Last resort: rethrow the error
      throw err;
    });
  };
};

export default asyncHandler;

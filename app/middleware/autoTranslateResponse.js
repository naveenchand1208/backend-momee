const {
  autoTranslate
} = require('../helpers/autoTranslate');

module.exports =
  function autoTranslateResponse(
    req,
    res,
    next
  ) {

    const originalJson =
      res.json.bind(res);

    res.json = async function (body) {

      try {

        const language =
          req.language || 'en';

        if (
          language === 'ta' &&
          body
        ) {

          body =
            await autoTranslate(
              body,
              language
            );
        }

        return originalJson(body);

      } catch (error) {

        console.error(
          'Automatic translation error:',
          error
        );

        // If translation fails,
        // don't break the API.
        // Return the original English response.
        return originalJson(body);
      }
    };

    next();
  };
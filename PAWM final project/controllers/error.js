/**
 * Questo controller gestisce gli errori error 404 page not found nel caso in cui non venga trovato l'url rihciesto dall'utente
 * e l'error 500 per errori legati a problemi server-side
 */

exports.get404 = (req, res, next) => {
  res.status(404).render('404', {
    pageTitle: 'Page Not Found',
    path: '/404',
    isAuthenticated: req.session.isLoggedIn
  });
};
exports.get500 = (req, res, next) => {
  res.status(500).render('500', {
    pageTitle: 'Error!',
    path: '/500',
    isAuthenticated: req.session.isLoggedIn
  });
};

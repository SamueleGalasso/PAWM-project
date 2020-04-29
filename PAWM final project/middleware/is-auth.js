/**
 * middleware usato per verificare se l'utente è loggato, infatti verifichiamo se il campo isLoggedIn della session è true,
 * in caso affermativo chiamiamo next() passando al prossimo middleware altrimenti veniamo reindirizzati alla pagina di login.
 */

module.exports = (req, res, next) => {
    if (!req.session.isLoggedIn) {
        return res.redirect('/login');
    }
    next();
};

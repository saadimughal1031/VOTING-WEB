// Vercel serverless function - automatically handles /api/* routes
// When Vercel uses api/index.js, it routes /api/* requests here
// IMPORTANT: Vercel strips the /api prefix, so /api/elections becomes /elections
// But our Express routes are defined with /api prefix, so we need to add it back

// #region agent log
console.log('[api/index.js] Module loading', {
    isVercel: !!process.env.VERCEL,
    vercelUrl: process.env.VERCEL_URL,
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
});
// #endregion

const app = require('../backend-node/server');

// #region agent log
console.log('[api/index.js] Express app loaded', {
    hasApp: !!app,
    appType: typeof app,
    timestamp: new Date().toISOString()
});
// #endregion

// Vercel serverless function handler
// When Vercel routes /api/* to this function, it passes the path WITHOUT /api
// So we need to add /api back to match our Express routes
module.exports = (req, res) => {
    // #region agent log
    const originalPath = req.url;
    const originalPathPath = req.path;
    console.log('[api/index.js] Request received', {
        method: req.method,
        originalUrl: req.originalUrl,
        url: req.url,
        path: req.path,
        needsApiPrefix: !req.url.startsWith('/api')
    });
    // #endregion
    
    // Vercel routes /api/* to this function. 
    // If the path doesn't start with /api, we add it back so Express can handle it.
    // However, if the path is /uploads, we keep it as is.
    if (!req.url.startsWith('/api') && !req.url.startsWith('/uploads')) {
        const oldUrl = req.url;
        req.url = '/api' + (req.url === '/' ? '' : req.url);
        req.originalUrl = req.url;
        
        console.log('[api/index.js] Rewrote path for Express:', {
            original: oldUrl,
            translated: req.url
        });
    }
    
    // Handle the request with Express app
    app(req, res);
};


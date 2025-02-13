require('dotenv').config()
const path = require('path')
const routes = require('./src/routes')

const lti = require('ltijs').Provider
const Database = require('ltijs-sequelize')

const provMainDebug = require('debug')('provider:slides')

const production = (process.env.PRODUCTION === 'true')
const platforms = require('./platforms.json').platforms

// Setup ltijs-sequelize using the same arguments as Sequelize's generic contructor
const db = new Database(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
	host: process.env.DB_HOST,
	port: process.env.DB_PORT,
	dialect: 'mysql',
	logging: false
})

// Setup
lti.setup(process.env.LTI_KEY, {
	plugin: db // Passing db object to plugin field
}, {
	staticPath: path.join(__dirname, './public'), // Path to static files
	cookies: {
		secure: production, // Set secure to true if the testing platform is in a different domain and https is being used
		sameSite: production ? 'None' : '' // Set sameSite to 'None' if the testing platform is in a different domain and https is being used
	},
	devMode: !production // Set DevMode to true if the testing platform is in a different domain and https is not being used
})

// When receiving successful LTI launch redirects to app
lti.onConnect(async (token, req, res) => {
	return res.sendFile(path.join(__dirname, './public/index.html'))
})

// When receiving deep linking request redirects to deep screen
lti.onDeepLinking(async (token, req, res) => {
	return lti.redirect(res, '/deeplink', { newResource: true })
})

// Setting up routes
lti.app.use(routes)

// Whitelist (i.e., not require auth)
lti.whitelist('/resources')

// Setup function
const setup = async () => {
	await lti.deploy({ port: process.env.PORT })

	// Register platforms
	for(const platform of platforms) {
		await lti.registerPlatform(platform)
	}
}

setup()
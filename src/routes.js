const router = require('express').Router()
const path = require('path')
const readdir = require('fs/promises').readdir

// Requiring Ltijs
const lti = require('ltijs').Provider

// Deep Linking route, displays the resource selection view
router.get('/deeplink', async (req, res) => {
	return res.sendFile(path.join(__dirname, '../public/resources.html'))
})

// Deep linking route
router.post('/deeplink', async (req, res) => {
	try {
		const resource = req.body.resource

		const items = [{
			type: 'ltiResourceLink',
			title: resource.replaceAll('_', ' '),
			url: process.env.TOOL_URL + "/slide?resource=" + resource,
		}]

		const form = await lti.DeepLinking.createDeepLinkingForm(res.locals.token, items, { message: 'Successfully Registered' })

		if (form) {
			return res.send(form)
		} else {
			return res.sendStatus(500).send("Deep linking form could not be created.")
		}
	} catch (err) {
		return res.status(500).send(err.message)
	}
})

router.get('/slide', async (req, res) => {
	return res.sendFile(path.join(__dirname, '../public/slide.html'))
})

// Return available deep linking resources
router.get('/resources', async (req, res) => {

	const resources = (await readdir('./public/slides', { withFileTypes: true })).filter(dirent => dirent.isDirectory()).map(dirent => {
		return {
			'name': dirent.name.replaceAll('_', ' '),
			'value': dirent.name
		}
	})
	
	return res.json(resources)
})

module.exports = router
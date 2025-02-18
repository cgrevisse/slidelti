# SlideLTI

This Express web application enables LTI integration of a histology slide viewer in LMS like Moodle. It uses the [Ltijs framework](https://github.com/Cvmcosta/ltijs) as well as [OpenSeadragon](https://openseadragon.github.io/). It is based on the [Ltijs Demo Server](https://github.com/Cvmcosta/ltijs-demo-server).

The integration was tested on Moodle 4.1.

## Requirements

- Node.js and `npm`: `sudo apt install nodejs npm`

- MySQL (or another database engine): 
	
	```bash
	sudo apt install mysql-server
	sudo mysql_secure_installation
	```

## Usage

- Download or clone this repository.
- Create an `.env` file and set the relevant variables, e.g.:

	```ini
	TOOL_URL="http://localhost:3000"
	PORT="3000"
	DB_HOST="localhost"
	DB_PORT="8889"
	DB_NAME="slidelti"
	DB_USER="slidelti"
	DB_PASS="password"
	LTI_KEY="ltikey" # at least 16 characters long
	PRODUCTION=true
	```

	Be sure to create the database and its user: `mysql -u root -p`

	In the MySQL console:

	```sql
	CREATE DATABASE slidelti;
	CREATE USER 'slidelti'@'localhost' IDENTIFIED WITH mysql_native_password BY 'password';
	GRANT ALL PRIVILEGES ON slidelti.* TO 'slidelti'@'localhost';
	FLUSH PRIVILEGES;
	```

- Create a `platforms.json` file with the detail of your Moodle installation(s), e.g.:

	```json
	{
		"platforms": [
			{
				"url": "https://your.moodle.edu/moodle",
				"name": "<Name of your choice>",
				"clientId": "<Provided by your Moodle installation>",
				"authenticationEndpoint": "https://your.moodle.edu/moodle/mod/lti/auth.php",
				"accesstokenEndpoint": "https://your.moodle.edu/moodle/mod/lti/token.php",
				"authConfig": {
					"method": "JWK_SET",
					"key": "https://your.moodle.edu/moodle/mod/lti/certs.php"
				}
			}
		]
	}
	```

	You can get these values from the *Tool configuration details* on your Moodle installation (see below).

- Create a folder `public/slides` which contains the tile sources, e.g., in DZI (Deep Zoom Image) format. In our case, we had slides scanned in MIRAX (`.mrxs`) format, which we converted with `vips dzsave` (cf. [libvips](https://github.com/libvips/libvips)).

- Run `npm install` to install all dependencies.
- Run `npm start` to start the server

## Moodle Integration

As an integration example, we take the popular Moodle LMS:

- In *Site Administration > Plugins > Activity modules > External tool > Manage tools*, click on *configure a tool manually*.
- Enter the following settings:
	- **Tool name:** SlideLTI (or any name of your choice)
	- **Tool URL:** The URL on which the tool is reachable (the same as in your `.env` file), with a trailing `/`
	- **LTI version:** LTI 1.3
	- **Public key type:** Keyset URL
	- **Public keyset:** The tool URL + `/keys`
	- **Initiate login URL:** The tool URL + `/login`
	- **Redirection URI(s):**
		- The tool URL + `/`
		- The tool URL + `/slide`
	- **Supports Deep Linking (Content-Item Message)**: Enabled
	- **Privacy:** Set all settings to *Never*

After saving the tool, you can click on its *View configuration details* icon to see the endpoints necessary for the `platforms.json` file (see above).

For development purposes where the tool might be available through `localhost`, be sure to remove any *cURL blocked hosts list* and add *cURL allowed ports list* as necessary in *Site Administration > General > Security > HTTP security*.

You can now add this external tool to a course (Enable *Edit mode*, click on *Add an activity or resource > External tool*). In the activity settings, set the *Preconfigured tool* to the tool name configured before. Click on *Select content* to select a particular slide. 

## Deployment

In production, you would like to deploy this within a server like *nginx*:

- Install [PM2](https://pm2.keymetrics.io/), a daemon process manager for Node.JS: `sudo npm install -g pm2`
- Start the SlideLTI application: `pm2 start index.js`
- Install [nginx](https://nginx.org/): `sudo apt install nginx`
- Create a virtual host configuration: `sudo nano /etc/nginx/sites-available/slidelti`

	Add the following content:

	```nginx
	server {
		listen 80;
		server_name yourdomain.com;

		location / {
			proxy_pass http://localhost:3000;
			proxy_http_version 1.1;
			proxy_set_header Upgrade $http_upgrade;
			proxy_set_header Connection 'upgrade';
			proxy_set_header Host $host;
			proxy_cache_bypass $http_upgrade;
			add_header Access-Control-Allow-Origin https://your.moodle.edu always;
			proxy_hide_header X-Frame-Options;
			add_header Content-Security-Policy "frame-ancestors 'self' https://your.moodle.edu";
			add_header "Cross-Origin-Resource-Policy" "cross-origin";
			add_header "Cache-Control" "max-age=0, no-cache, no-store, must-revalidate";
			add_header Pragma no-cache;
		}
	}
	```

	Adapt the `TOOL_URL` in your `.env` file according to your server domain.

- Create a symlink in `/etc/nginx/sites-enabled`: `sudo ln -s /etc/nginx/sites-available/slidelti /etc/nginx/sites-enabled`
- (Re-)start nginx: `sudo service nginx restart`

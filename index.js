//NODU MODULES
const helmet = require("helmet"); // Middleware for enhancing security by setting various HTTP headers.
const morgan = require("morgan"); // Middleware for logging HTTP requests and responses.
const config = require("config"); // Library for managing application configuration based on environment.
const express = require("express"); // Web framework for building server-side applications in Node.js.

// a middleware function that parses incoming JSON requests and makes the parsed data available under req.body.
const app = express();

//TEMPLATE ENGINE
// Set Pug as the template engine for rendering views.
//Template Engine: Pug is a template engine for Node.js that allows you to write HTML in a more concise and readable syntax.
//Rendering Views: By setting the view engine to Pug, you can render .pug files located in your views directory. Express will automatically use Pug to compile these templates into HTML.
//Usage: When you call res.render('templateName') in your route handlers, Express will look for templateName.pug in the views directory, compile it to HTML using Pug, and send the resulting HTML as the response
app.set("view engine", "pug");
// Set the directory where the application's view templates are located.
app.set("views", "./views"); //default setting, so we dont have to set this, unless we use another dirname

//DEBUGGERS
//You can call the debugger:   startupDebugger("Morgan enabled...");
//In order to get the nice version, Write in cmd:  DEBUG_HIDE_DATE=true DEBUG=app:startup nodemon index.js
//Note, if you want to turn on multiple debuggers, do: DEBUG=app:startup,app:db   or if you want all do:  DEBUG=app*
//Remove the debugger with: export DEBUG=
const startupDebugger = require("debug")("app:startup");

//ROUTES
const home = require("./routes/home");
const pays = require("./routes/group");
const customers = require("./routes/users");

//PROCESS ENVIRONMENT
//process.env.NODE_ENV is a standard env var. If it is not set, it will return undefined
//We can get this env var from express as well "app.get('env'). How ever, if the env var is not set, it will return undefined by default"
//We can set it to development, testing, staging or production.
startupDebugger(`NODE_ENV: ${process.env.NODE_ENV}`);
startupDebugger(`app: ${app.get("env")}`);

if (app.get("env") === "development") {
  //Morgan is an HTTP request logger middleware for Node.js. It generates logs for every HTTP request made to your server, which can be useful for debugging and monitoring.
  //You can analyze these logs to identify patterns, bottlenecks, and potential problems.
  app.use(morgan("tiny"));
  startupDebugger("Morgan enabled...");
}

// MIDDLEWARE
//express.json() is a middleware function in Express.js that parses incoming requests with JSON payloads.
//This is useful when building APIs that receive and process JSON data. Here’s how you can use it in your Express.js application:
app.use(express.json());
// The express.urlencoded() middleware function in Express.js parses incoming requests with URL-encoded
// payloads. extended: true allows for rich objects and arrays to be encoded into the URL-encoded format, using the qs library.
// extended: false uses the querystring library to parse the URL-encoded data.
app.use(express.urlencoded({ extended: true }));
//with this middleware, we can serve static content. Now, we con go localhost:port/readme.txt and we get the static content of the public folder
app.use(express.static("public"));

//Helmet is a collection of middleware functions designed to enhance the security of Express.js applications by setting various HTTP headers.
app.use(helmet());

// Routes
app.use("/", home);
app.use("/api/pays", pays);
app.use("/api/customers", customers);

//CONFIGURATION
// set password in terminal: export app_password=4321
startupDebugger("Application Name: " + config.get("name"));
startupDebugger("Mail Server: " + config.get("mail.host"));
startupDebugger("Mail Password: " + config.get("mail.password"));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  startupDebugger(`listening on port: ${port}...`);
});

// START THE PROJECT IN DEVELOPMENT MODE WITH THIS COMMAND
// export NODE_ENV=development app_password=4321; DEBUG_HIDE_DATE=true DEBUG=app:* nodemon index.js

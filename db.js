const dotenv = require("dotenv");
dotenv.config();
const { MongoClient } = require("mongodb");
const client = new MongoClient(process.env.MONGO_DB_CONNECTION);

let dbClientInstance = null;

const connectToMongo = async () => {
	if (dbClientInstance) {
		console.log("Already connected to MongoDB.");
		return;
	}

	try {
		await client.connect();
		dbClientInstance = client;
		console.log("Connected to MongoDB");
		const app = require("./app");
		app.listen(process.env.PORT);
	} catch (error) {
		console.error("Error connecting to MongoDB:", error);
		throw error;
	}
};

const getDb = () => {
	if (!dbClientInstance) {
		throw new Error("Database not initialized. Call connectToMongo first.");
	}
	return dbClientInstance;
};

connectToMongo();

module.exports = { getDb };

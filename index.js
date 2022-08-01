require('dotenv').config();
require('./dist/db/connect').connectDB();
require('./dist/src/bot');

import chalk from 'chalk';
import { connect } from 'mongoose';

export const connectDB = async () => {
  try {
    const { host, db } = (await connect(process.env.MONGO_URI, { dbName: 'vladbot' })).connection;

    console.log(chalk`[{red DB}] Connected to MongoDB on: {cyan ${host}/${db.databaseName}}`);
  } catch (err) {
    throw err;
  }
}

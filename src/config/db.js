import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

export const connectDB = async () => {
  try {
    const connection = await mongoose.connect(process.env.URI_LINK);
    console.log(`✅ MongoDB conectado: ${connection.connection.host}`);
    return connection;
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    process.exit(1);
  }
};
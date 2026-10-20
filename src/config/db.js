import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

export const connectDB = async () => {
  try {
    const uri = process.env.URI_LINK;
    if (!uri) {
      throw new Error('Falta URI_LINK en el archivo .env');
    }

    const connection = await mongoose.connect(uri);
    console.log(`✅ MongoDB conectado: ${connection.connection.host}`);
    return connection;
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    process.exit(1);
  }
};
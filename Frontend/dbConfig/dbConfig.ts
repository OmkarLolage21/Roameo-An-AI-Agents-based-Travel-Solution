import mongoose from 'mongoose';

let isConnected = false;

export async function connect() {
    if (isConnected) {
        console.log('Already connected to MongoDB');
        return;
    }

    try {
        await mongoose.connect(process.env.MONGO_URI!);
        isConnected = true;
        const connection = mongoose.connection;

        connection.on('connected', () => {
            console.log('MongoDB connected successfully');
        })

        connection.on('error', (err) => {
            console.log('MongoDB connection error. Please make sure MongoDB is running. ' + err);
            isConnected = false;
        })

        connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
            isConnected = false;
        })
    } catch (error: any) {
        console.log('MongoDB connection failed!');
        console.log(error.message);
        isConnected = false;
        throw new Error(`Database connection failed: ${error.message}`);
    }
}
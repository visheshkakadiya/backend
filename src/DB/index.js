import mongoose from "mongoose";
import { DB_name } from "../../src/constants.js";

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGO_URi}/${DB_name}`)
        console.log(`\n MONGODB connected !! ${connectionInstance.connection.host}`)
    } catch (error) {
        console.log("failed to connect with MONGODB", error)
        process.exit(1)
    }
}

export default connectDB
import dotenv from "dotenv";
import connectDB from "./DB/index.js";
import { app } from "./app.js";

dotenv.config({
    path: '.env'
})

app.get("/", (req, res) => {
    res.send("Hello, World!");
  });
  
  app.get("/api/test", (req, res) => {
    res.json({ message: "API is working!" });
  });  

connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`server is running at port ${process.env.PORT}`)
    })
}).catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
});
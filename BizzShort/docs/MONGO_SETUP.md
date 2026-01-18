# MongoDB Setup Required

The BizzShort backend now requires a MongoDB database to run.

## Option A: Local Installation (Recommended)
1.  **Download**: [MongoDB Community Server](https://www.mongodb.com/try/download/community)
2.  **Install**: Run the MSI installer (Select "Run as Service" during install).
3.  **Verify**: Open CMD and type `mongod --version`.
4.  **Start**: The service usually starts automatically. If not, run `net start MongoDB`.

## Option B: Cloud (MongoDB Atlas)
1.  Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas).
2.  Create a Cluster -> Connect -> "Connect your application".
3.  Copy the connection string (looks like `mongodb+srv://<user>:<password>@cluster...`).
4.  Update the `.env` file in `c:\BizzShort` with:
    ```
    MONGO_URI=your_connection_string_here
    ```

Once the database is running, restart the server:
`node server.js`

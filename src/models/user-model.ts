// Connection import
import databaseConnection from "./database-connection"

// Util imports
import hashPassword from "../utils/hash-password";
import createAuthToken from "../middlewares/create-auth-token";
import { UserClientData, userModelResponse } from "../utils/types";

// Node module imports
import DatabaseConnection from "./database-connection";


class UserModel {
    async authenticateUser(email: string, password: string): Promise<userModelResponse> {
        let conn = await DatabaseConnection.create();
        if (conn === undefined) {
            return {
                success: false,
                status_code: 500
            }
        }

        let hashedPassword = hashPassword(password);

        try {
            let queryStr: string = `SELECT * FROM Users WHERE email="${email}" AND password="${hashedPassword}";`;
            let queryResults: any = await conn.query(queryStr);
            conn.release();

            queryResults = queryResults[0];

            if (queryResults.length < 1) {
                return {
                    success: false,
                    status_code: 404
                }
            }

            let queryResult = queryResults[0];

            let auth_token: string = createAuthToken(
                queryResult["user_id"],
                queryResult["username"],
                queryResult["email"]);

            return {
                success: true,
                status_code: 200,
                auth_token
            }

        } catch (err) {
            console.log(err);
            return {
                success: false,
                status_code: 500,
            }
        }
    }


    async createUser(username: string, password: string, email: string): Promise<userModelResponse> {
        let conn = await DatabaseConnection.create();
        if (conn === undefined) {
            return {
                success: false,
                status_code: 500,
            }
        }

        let hashedPassword = hashPassword(password);

        try {
            let queryStr: string = `INSERT INTO Users (username, password, email) VALUES("${username}", "${hashedPassword}", "${email}");`;
            let queryResult: any = await conn.query(queryStr);
            conn.release();

            /* Result when printing queryResult[0]:
                ResultSetHeader {
                fieldCount: 0,
                affectedRows: 1,
                insertId: 2,
                info: '',
                serverStatus: 2,
                warningStatus: 0
            }
            */

            let newUserID = queryResult[0].insertId

            let auth_token = createAuthToken(newUserID, username, email);

            return {
                success: true,
                status_code: 400,
                auth_token
            }

        } catch (err) {
            return {
                success: false,
                status_code: 500
            }
        }
    }


    async userExists(email: string): Promise<boolean | undefined> {
        let conn = await DatabaseConnection.create();
        email = email.toLowerCase();
        if (conn === undefined) {
            return undefined;
        }

        try {
            let queryResult: any = await conn.query(`SELECT * FROM Users WHERE email="${email}";`);
            conn.release();

            if (queryResult[0].length !== 0) {
                return true;
            }
            return false;
        } catch (err) {
            return false;
        }
    }

    async userClientData(user_id: number): Promise<UserClientData | undefined> {
        let conn = await DatabaseConnection.create();
        if (conn === undefined) {
            return undefined;
        }

        let queryStr: string = `SELECT * FROM Users WHERE user_id=${user_id}`;
        try {
            let queryResult: any = conn.query(queryStr);

            if (queryResult[0].length === 0) {
                return undefined;
            }

            let username: string = queryResult[0][0]["username"];
            let email: string = queryResult[0][0]["email"];

            return {
                user_id,
                username,
                email
            }

        } catch (err) {
            return undefined;
        }
    }


}



export default new UserModel();

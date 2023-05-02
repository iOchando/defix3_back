"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Routes = void 0;
class Routes {
    constructor(router, controller) {
        this.controller = controller;
        this.configureRoutes(router);
    }
    configureRoutes(router) {
        /**
         * Post track
         * @swagger
         * /create-subscription/:
         *    post:
         *      tags:
         *        - Subscription
         *      summary: Enviar correo para subscribirse a Defix3.
         *      description: Registrar correo.
         *      requestBody:
         *          content:
         *            application/json:
         *              schema:
         *                type: "object"
         *                required: [email]
         *                properties: {
         *                  email: {
         *                    type: "string"
         *                  }
         *                }
         *      responses:
         *        '200':
         *          description: Success.
         *        '400':
         *          description: Bad Request.
         *        '500':
         *          description: Internal Server Error.
         */
        router.post("/create-subscription/", this.controller.setEmailSubscription);
    }
}
exports.Routes = Routes;

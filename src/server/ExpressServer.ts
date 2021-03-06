import {Server} from "./Server";
import {ParamType} from "../metadata/ParamMetadata";
import {ResponseInterceptorInterface} from "../interceptor/ResponseInterceptorInterface";
import {BadHttpActionError} from "./error/BadHttpActionError";
import {ResultHandleOptions} from "./../ResultHandleOptions";
import {InterceptorHelper} from "../interceptor/InterceptorHelper";

/**
 * Integration with Express.js framework.
 */
export class ExpressServer implements Server {

    // -------------------------------------------------------------------------
    // Properties
    // -------------------------------------------------------------------------

    private _interceptorHelper = new InterceptorHelper();

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(private express: any) {
    }

    // -------------------------------------------------------------------------
    // Accessors
    // -------------------------------------------------------------------------

    set interceptorHelper(interceptorHelper: InterceptorHelper) {
        this._interceptorHelper = interceptorHelper;
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    registerAction(route: string|RegExp, actionType: string, executeCallback: (request: any, response: any) => any): void {
        const expressAction = actionType.toLowerCase();
        if (!this.express[expressAction])
            throw new BadHttpActionError(actionType);

        this.express[expressAction](route, (request: any, response: any) => executeCallback(request, response));
    }

    getParamFromRequest(request: any, paramName: string, paramType: ParamType): void {
        switch (paramType) {
            case ParamType.BODY:
                return request.body;
            case ParamType.PARAM:
                return request.params[paramName];
            case ParamType.QUERY:
                return request.query[paramName];
            case ParamType.BODY_PARAM:
                return request.body[paramName];
            case ParamType.COOKIE:
                return request.cookies[paramName];
        }
    }

    handleSuccess(options: ResultHandleOptions): void {
        if (options.successHttpCode)
            options.response.status(options.successHttpCode);

        this.handleResult(options);
    }

    handleError(options: ResultHandleOptions): void {
        if (options.errorHttpCode)
            options.response.status(options.errorHttpCode);

        this.handleResult(options);
    }

    // -------------------------------------------------------------------------
    // Private Methods
    // -------------------------------------------------------------------------

    private handleResult(options: ResultHandleOptions) {
        if (options.headers)
            options.headers.forEach(header => options.response.header(header.name, header.value));

        if (options.content !== null && options.content !== undefined) {
            const result = this._interceptorHelper.callInterceptors(options);
            if (options.renderedTemplate) {
                const renderOptions = result && result instanceof Object ? result : {};
                this.express.render(options.renderedTemplate, renderOptions, (err: any, html: string) => {
                    if (err && options.asJson) {
                        options.response.json(err);

                    } else if (err && !options.asJson) {
                        options.response.send(err);

                    } else if (html) {
                        options.response.send(html);
                    }
                });
            } else if (options.redirect) {
                options.response.redirect(options.redirect);

            } else if (options.asJson) {
                options.response.json(result);

            } else {
                options.response.send(result);
            }
        }

        options.response.end();
    }

}
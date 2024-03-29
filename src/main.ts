import {Server, ServerCredentials} from "grpc";
import {configure, getLogger} from "log4js";
import {DependencyExtractor} from "../api/extractor";
import ExtractorRegistry from "./extractors/ExtractorRegistry";
import AsyncDependencyExtractor from "./service/AsyncDependencyExtractor";
import DependencyExtractorImpl from "./service/DependencyExtractorImpl";
import unasyncify from "./service/unasyncify";
import program = require("caporal");
import health = require("grpc-health-check/health");

const logger = getLogger();

program.name("extractor")
    .option("--port <port>", "The port to bind to.", program.INT)
    .action(async (args: any, options: any) => {
        configure({
            appenders: {
                console: { type: "console" },
            },
            categories: {
                default: {
                    appenders: [ "console" ],
                    level: "debug",
                },
            },
        });

        const extractorReqs = ExtractorRegistry.known()
            .map((extractor) => ExtractorRegistry.resolve(extractor, null));

        const extractors = await Promise.all(extractorReqs);

        const port = options.port || 8090;
        const impl: AsyncDependencyExtractor = new DependencyExtractorImpl(extractors);

        const healthcheck = new health.Implementation({});
        // toggle the service health as such
        // healthcheck.setStatus("", "NOT_SERVING");

        const server = new Server();
        server.addService(DependencyExtractor.service, unasyncify(impl));
        server.addService(health.service, healthcheck);

        server.bind(`0.0.0.0:${port}`, ServerCredentials.createInsecure());
        logger.info(`[main] starting gRPC on :${port}`);
        server.start();
    })
    .parse(process.argv);

import {Dependency, DependencyManagementFile} from "../../api/deps";
import Extractor from "./Extractor";
import ExtractorFile from "./ExtractorFile";
import parseImportPath from "./goutils/parseImportPath";
import Languages from "./Languages";

interface ID {
    organization: string;
    module: string;
}

const fileName = "vendor.conf";
const organizationString = "organization";
const moduleString = "module";

function parseName(dependency: string): ID {
    let organization = "_";
    let module = "";
    let dependencyArray = [];
    dependencyArray = dependency.split("/");
    if (dependency.includes("github.com")) {
        organization = dependencyArray[1];
        module = dependencyArray[2];
    } else if (dependency.includes("golang.org")) {
        organization = dependencyArray[0];
        module = dependencyArray[2];
    } else {
        organization = dependencyArray[0];
        module = dependencyArray[1];
        if (dependencyArray[2] != null) {
            module = module + "/" + dependencyArray[2];
        }
    }

    return { organization, module };
}

export default class VendorConfExtractor implements Extractor {
    public requires(): string[] {
        return [ fileName ];
    }

    public async extract(files: { [p: string]: ExtractorFile }): Promise<DependencyManagementFile> {
        const content = files[fileName].raw();

        const lines = content.split(/\n+/g);

        let id = {};
        id[organizationString] = null;
        id[moduleString] = null;
        let idFlag = true;
        const dependencies = [];
        for (var line of lines) {
            let trimmedLine = line.trim();
            if (trimmedLine.length === 0) {
                continue; // empty line
            }

            const parts = trimmedLine.split(/\s+/);
            const directive = parts[0];
            if (directive === '#') {
                continue;
            }
            if (idFlag) {
                id = parseName(directive);
                idFlag = false;
                continue;
            }

            const version = parts[1];
            var { organization, module } = parseName(directive);

            let scopes = [];
            if (parts[2] != null) {
                scopes.push(parts[2]);
            }

            const dependencyMap: Dependency = {
                organization: organization,
                module: module,
                versionConstraint: version,
                scopes: scopes,
            };

            dependencies.push(dependencyMap);
        }

        if (id[organizationString] === null || id[moduleString] === null) {
            throw new Error(`parse error: no module present`);
        }

        return {
            language: Languages.GO,
            system: "vendor",
            organization: id[organizationString],
            module: id[moduleString],
            version: "latest",
            dependencies,
        };
    }
}

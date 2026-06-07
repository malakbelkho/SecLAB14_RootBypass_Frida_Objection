/*
 LAB 14 - Bypass Root Detection Native
 Compatible Frida 17+
 Objectif: bloquer certains accès natifs vers su, busybox, mounts, magisk.
*/

const nativeSuspicious = [
    "/system/bin/su",
    "/system/xbin/su",
    "/sbin/su",
    "/system/su",
    "/vendor/bin/su",
    "/system/bin/busybox",
    "/system/xbin/busybox",
    "/proc/mounts",
    "/proc/self/mounts"
];

function shouldBlockPath(ptrPath) {
    try {
        if (ptrPath.isNull()) {
            return false;
        }

        const path = ptrPath.readCString();

        if (!path) {
            return false;
        }

        for (let i = 0; i < nativeSuspicious.length; i++) {
            if (path.indexOf(nativeSuspicious[i]) !== -1) {
                return true;
            }
        }

        if (path.toLowerCase().includes("magisk")) {
            return true;
        }

        return false;
    } catch (e) {
        return false;
    }
}

function getLibcExport(functionName) {
    try {
        const libc = Process.getModuleByName("libc.so");
        return libc.getExportByName(functionName);
    } catch (e1) {
        try {
            return Module.getGlobalExportByName(functionName);
        } catch (e2) {
            console.log("[*] Export introuvable :", functionName);
            return null;
        }
    }
}

function hookNativeFunction(functionName, pathArgumentIndex) {
    const address = getLibcExport(functionName);

    if (address === null) {
        return;
    }

    Interceptor.attach(address, {
        onEnter: function (args) {
            const pathArg = args[pathArgumentIndex];

            if (pathArg && shouldBlockPath(pathArg)) {
                this.block = true;
                this.path = pathArg.readCString();
            }
        },

        onLeave: function (retval) {
            if (this.block) {
                console.log("[+] Appel natif bloqué :", functionName, "->", this.path);
                retval.replace(ptr(-1));
            }
        }
    });

    console.log("[+] Hook natif installé :", functionName);
}

hookNativeFunction("open", 0);
hookNativeFunction("openat", 1);
hookNativeFunction("access", 0);
hookNativeFunction("stat", 0);
hookNativeFunction("lstat", 0);
hookNativeFunction("fopen", 0);

console.log("[LAB14] Hooks natifs chargés.");
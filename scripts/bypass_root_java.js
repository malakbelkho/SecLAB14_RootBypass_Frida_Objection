/*
 LAB 14 - Stable Java Root Bypass
 Compatible Frida 17+
*/

const suspiciousPaths = [
    "/system/bin/su",
    "/system/xbin/su",
    "/sbin/su",
    "/system/su",
    "/vendor/bin/su",
    "/system/app/Superuser.apk",
    "/system/app/SuperSU.apk",
    "/system/bin/busybox",
    "/system/xbin/busybox",
    "/data/local/bin/su",
    "/data/local/xbin/su",
    "/data/local/su"
];

function lower(value) {
    try {
        return ("" + value).toLowerCase();
    } catch (e) {
        return "";
    }
}

function isSuspiciousCommand(cmd) {
    const c = lower(cmd);
    return (
        c === "su" ||
        c.includes(" su") ||
        c.includes("which su") ||
        c.includes("busybox") ||
        c.includes("magisk")
    );
}

Java.perform(function () {
    console.log("[LAB14] Stable Java bypass loading...");

    try {
        const Build = Java.use("android.os.Build");
        Build.TAGS.value = "release-keys";
        console.log("[+] Build.TAGS -> release-keys");
    } catch (e) {
        console.log("[-] Build.TAGS hook failed:", e);
    }

    try {
        const File = Java.use("java.io.File");
        const exists = File.exists.overload();

        exists.implementation = function () {
            const path = this.getAbsolutePath();

            if (suspiciousPaths.indexOf(path) !== -1) {
                console.log("[+] File.exists blocked:", path);
                return false;
            }

            return exists.call(this);
        };

        console.log("[+] File.exists hook installed safely");
    } catch (e) {
        console.log("[-] File.exists hook failed:", e);
    }

    try {
        const Runtime = Java.use("java.lang.Runtime");
        const JString = Java.use("java.lang.String");
        const StringArray = Java.use("[Ljava.lang.String;");

        const execString = Runtime.exec.overload("java.lang.String");
        execString.implementation = function (cmd) {
            if (isSuspiciousCommand(cmd)) {
                console.log("[+] Runtime.exec blocked:", cmd);
                return execString.call(this, JString.$new("echo"));
            }

            return execString.call(this, cmd);
        };

        const execArray = Runtime.exec.overload("[Ljava.lang.String;");
        execArray.implementation = function (arr) {
            const jsArray = arr ? Array.from(arr) : [];
            const joined = jsArray.join(" ");

            if (isSuspiciousCommand(joined)) {
                console.log("[+] Runtime.exec array blocked:", joined);
                const replacement = StringArray.$new(1);
                replacement[0] = JString.$new("echo");
                return execArray.call(this, replacement);
            }

            return execArray.call(this, arr);
        };

        console.log("[+] Runtime.exec hooks installed safely");
    } catch (e) {
        console.log("[-] Runtime.exec hook failed:", e);
    }

    try {
        const RootBeer = Java.use("com.scottyab.rootbeer.RootBeer");

        RootBeer.isRooted.implementation = function () {
            console.log("[+] RootBeer.isRooted -> false");
            return false;
        };

        console.log("[+] RootBeer hook installed");
    } catch (e) {
        console.log("[*] RootBeer not present / not loaded");
    }

    console.log("[LAB14] Stable Java bypass installed.");
});
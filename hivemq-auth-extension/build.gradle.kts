plugins {
    java
}

group = "com.twinkletaps"
version = "1.0.0"

java {
    sourceCompatibility = JavaVersion.VERSION_11
    targetCompatibility = JavaVersion.VERSION_11
}

repositories {
    mavenCentral()
}

dependencies {
    compileOnly("com.hivemq:hivemq-extension-sdk:4.48.1")
    implementation("com.google.code.gson:gson:2.10.1")

    testImplementation("com.hivemq:hivemq-extension-sdk:4.48.1")
    testImplementation("org.junit.jupiter:junit-jupiter:5.10.2")
    testImplementation("org.mockito:mockito-core:5.11.0")
}

tasks.test {
    useJUnitPlatform()
}

tasks.register<Copy>("deployExtension") {
    dependsOn(tasks.jar)
    from(tasks.jar)
    from(configurations.runtimeClasspath)
    from("src/main/resources/hivemq-extension.xml")
    into("build/deploy/twinkletaps-auth-extension")
}

tasks.named("build") {
    dependsOn("deployExtension")
}

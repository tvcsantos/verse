import groovy.json.JsonOutput
import groovy.json.JsonGenerator

fun Project.qualifiedVersionProperty(): String {
    val name = name.split(':').last()
    return if (name.isEmpty()) "version" else "${name}.version"
}

gradle.rootProject {
    tasks.register("printHierarchyDeps") {
        group = "help"
        description = "Shows which subprojects are affected when a parent project changes."

        // Capture hierarchy data at configuration time to avoid Project references in execution
        val hierarchyDepsProvider = provider {
            val hierarchyEdges = linkedMapOf<String, Set<String>>()

            gradle.rootProject.allprojects.forEach { project ->
                val affectedChildren = mutableSetOf<String>()

                // Find all subprojects (direct and transitive children)
                fun collectSubprojects(parent: org.gradle.api.Project) {
                    parent.subprojects.forEach { child ->
                        affectedChildren.add(child.path)
                        collectSubprojects(child) // recursively collect grandchildren
                    }
                }

                collectSubprojects(project)
                hierarchyEdges[project.path] = affectedChildren.toSet()
            }
            hierarchyEdges
        }

        val projectDataProvider = provider {
            val projectData = linkedMapOf<String, Map<String, Any?>>()

            gradle.rootProject.allprojects.forEach { project ->
                val relativePath = gradle.rootProject.projectDir.toPath().relativize(project.projectDir.toPath()).toString()
                val path = if (relativePath.isEmpty()) "." else relativePath
                val version = if (project.version == "unspecified") null else project.version
                val type = if (project == gradle.rootProject) "root" else "module"

                val versionPropertyKey = project.qualifiedVersionProperty()
                val versionFromProperty = project.findProperty(versionPropertyKey) as? String

                projectData[project.path] = mapOf(
                    "path" to path,
                    "version" to version,
                    "type" to type,
                    "name" to project.name,
                    "declaredVersion" to (versionFromProperty != null)
                )
            }
            projectData
        }

        doLast {
            val hierarchyMap = hierarchyDepsProvider.get()
            val projectDataMap = projectDataProvider.get()

            val result = hierarchyMap.toSortedMap().mapValues { (projectPath, affectedProjects) ->
                val projectInfo = projectDataMap.getValue(projectPath)

                mapOf(
                    "path" to projectInfo["path"],
                    "affectedSubprojects" to affectedProjects.toSortedSet(),
                    "version" to projectInfo["version"],
                    "type" to projectInfo["type"],
                    "name" to projectInfo["name"],
                    "declaredVersion" to projectInfo["declaredVersion"]
                )
            }

            val generator = JsonGenerator.Options()
                .excludeNulls()
                .build()

            println(JsonOutput.prettyPrint(generator.toJson(result)))
        }
    }

    // Convenience alias
    tasks.register("hierarchy") {
        group = "help"
        description = "Show project hierarchy dependencies"
        dependsOn("printHierarchyDeps")
    }
}

import groovy.json.JsonOutput

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
            val projectData = linkedMapOf<String, Triple<String, String, String>>()

            gradle.rootProject.allprojects.forEach { project ->
                val relativePath = gradle.rootProject.projectDir.toPath().relativize(project.projectDir.toPath()).toString()
                val path = if (relativePath.isEmpty()) "." else relativePath
                val version = project.version.toString()
                val type = if (project == gradle.rootProject) "root" else "module"
                projectData[project.path] = Triple(path, version, type)
            }
            projectData
        }

        doLast {
            val hierarchyMap = hierarchyDepsProvider.get()
            val projectDataMap = projectDataProvider.get()

            val result = hierarchyMap.toSortedMap().mapValues { (projectPath, affectedProjects) ->
                val (path, version, type) = projectDataMap[projectPath] ?: Triple("unknown", "0.0.0", "module")
                mapOf(
                    "path" to path,
                    "affectedSubprojects" to affectedProjects.toSortedSet(),
                    "version" to version,
                    "type" to type
                )
            }

            println(JsonOutput.prettyPrint(JsonOutput.toJson(result)))
        }
    }

    // Convenience alias
    tasks.register("hierarchy") {
        group = "help"
        description = "Show project hierarchy dependencies"
        dependsOn("printHierarchyDeps")
    }
}

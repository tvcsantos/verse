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

        val projectPathsProvider = provider {
            val projectPaths = linkedMapOf<String, String>()

            gradle.rootProject.allprojects.forEach { project ->
                projectPaths[project.path] = project.projectDir.absolutePath
            }
            projectPaths
        }

        doLast {
            val hierarchyMap = hierarchyDepsProvider.get()
            val pathsMap = projectPathsProvider.get()

            val result = hierarchyMap.toSortedMap().mapValues { (projectPath, affectedProjects) ->
                mapOf(
                    "path" to (pathsMap[projectPath] ?: "unknown"),
                    "affectedSubprojects" to affectedProjects.toSortedSet()
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

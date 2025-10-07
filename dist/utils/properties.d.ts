/**
 * Update or insert a property in a properties file
 * @param propertiesPath Path to the properties file
 * @param key Property key to update or insert
 * @param value Property value to set
 */
export declare function upsertProperty(propertiesPath: string, key: string, value: string): Promise<void>;
/**
 * Update or insert multiple properties in a properties file in one operation
 * @param propertiesPath Path to the properties file
 * @param properties Map of property keys to values to update or insert
 */
export declare function upsertProperties(propertiesPath: string, properties: Map<string, string>): Promise<void>;
//# sourceMappingURL=properties.d.ts.map
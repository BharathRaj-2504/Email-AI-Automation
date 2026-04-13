/**
 * Renders a string template by replacing {{key}} with values from variables object.
 * @param {string} template - The template string with placeholders.
 * @param {Object} variables - Key-value pairs for replacement.
 * @returns {string} - Rendered string.
 */
const render = (template, variables = {}) => {
    if (!template) return "";
    return template.replace(/\{\{(.*?)\}\}/g, (match, key) => {
        const trimmedKey = key.trim();
        // Support nested objects like {{metadata.jobTitle}}
        const value = trimmedKey.split('.').reduce((obj, i) => obj ? obj[i] : null, variables);
        return value !== undefined && value !== null ? value : match;
    });
};

module.exports = { render };

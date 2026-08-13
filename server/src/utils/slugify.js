/**
 * Converts a free-text name into a URL-safe subdomain slug.
 * Example: "João da Silva Jr." -> "joao-da-silva-jr"
 */
function slugify(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents (combining diacritical marks)
    .toLowerCase()
    .trim()
    .replace(/[_]+/g, '-')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63); // DNS label length limit
}

module.exports = { slugify };

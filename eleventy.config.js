export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("CNAME");

  const spanishMonths = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];

  eleventyConfig.addFilter("spanishDate", (date) => {
    const d = date instanceof Date ? date : new Date(date);
    return `${d.getUTCDate()} ${spanishMonths[d.getUTCMonth()]}, ${d.getUTCFullYear()}`;
  });

  eleventyConfig.addFilter("englishDate", (date) => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  });

  eleventyConfig.addCollection("noticias", (collectionApi) =>
    collectionApi.getFilteredByGlob("src/noticias/*.md").sort((a, b) => b.date - a.date)
  );

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}

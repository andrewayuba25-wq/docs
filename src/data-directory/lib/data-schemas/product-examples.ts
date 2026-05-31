import { type Schema } from 'ajv'

// Schema for the product example data files in `data/product-examples`.
//
// Each file is an array of example entries rendered in the `Examples` section
// of pages that use the `product-landing` layout. Entries come in a few
// shapes: community examples (`repo`), user examples (`user`), and code
// examples (`title` + `href`). All entries share a required `description`.
// See `data/product-examples/README.md` for details.
const schema: Schema = {
  type: 'array',
  items: {
    type: 'object',
    required: ['description'],
    properties: {
      // Shared by every example type
      description: { type: 'string' },
      // Community examples
      repo: { type: 'string' },
      // User examples
      user: { type: 'string' },
      // Code examples
      title: { type: 'string' },
      href: { type: 'string' },
      // `languages` may be left empty (null) in the YAML.
      languages: {
        type: ['array', 'null'],
        items: { type: 'string' },
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
      },
      // `versions` uses the same syntax as the frontmatter `versions` property.
      versions: {
        type: ['string', 'object'],
      },
    },
    additionalProperties: false,
  },
}

export default schema

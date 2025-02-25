/** @jsxImportSource @compiled/react */
import {
  RootLayout,
  VerticalStack,
  Heading,
  mdxComponents,
  ToAnchor,
  AnchorProvider,
  colors,
  PageLink,
  Text,
} from '@compiled/website-ui';
import { MDXProvider } from '@mdx-js/react';
import { useLocation } from 'react-router-dom';

import { titleCase } from '../utils/string';

import { PageTitle } from './page-title';
import { ScrollTop } from './scroll-top';
import { LinkItem, Section } from './side-nav';

function requireAllPages() {
  const req = require.context('../pages');
  return req.keys().reduce(
    (acc, filename) =>
      Object.assign(acc, {
        [filename.replace('./', '').replace('.mdx', '')]: req(filename),
      }),
    {}
  );
}

interface Page {
  default: React.ComponentType<Record<string, never>>;
  data: {
    headings: {
      depth: number;
      text: string;
    }[];
    order?: number;
    name?: string;
    section: string;
  };
}

const getSections = () => {
  const pages: Record<string, Page> = requireAllPages();
  const sections: Record<string, (Page & { name: string })[]> = {};

  Object.entries(pages)
    .sort((page1, page2) => (page1[1].data.order || 100) - (page2[1].data.order || 100))
    .forEach(([pageName, page]) => {
      const section = page.data.section;
      if (!section) {
        throw new Error(`
Put ${pageName}.mdx in a section! E.g:
---
section: My section
---
      `);
      }

      sections[section] = sections[section] || [];
      sections[section].push({
        ...page,
        name: pageName,
      });
    });

  return Object.entries(sections)
    .sort(([a], [b]) => {
      const aOrder = Number(a.match(/^(\d+)-/)[1] || 100);
      const bOrder = Number(b.match(/^(\d+)-/)[1] || 100);
      return aOrder - bOrder;
    })
    .map(([name, pages]) => ({
      name: name,
      pages,
    }));
};

const getEditUrl = () => {
  const name = location.pathname.split('/')[2] || 'installation';
  return `https://github.com/atlassian-labs/compiled/tree/master/website/packages/docs/src/pages/${name}.mdx`;
};

const getPage = (slug: string) => {
  const sections = getSections();
  const name = slug === '/' ? sections[0].pages[0].name : slug.slice(1);
  const pages: Record<string, Page> = requireAllPages();

  const page = pages[name];
  if (!page) {
    return null;
  }

  const sectionIndex = sections.findIndex((section) => section.name === page.data.section);
  const previousSection = sections[sectionIndex - 1];
  const nextSection = sections[sectionIndex + 1];
  const section = sections[sectionIndex];
  const pageIndex = section.pages.findIndex((page) => page.name === name);
  const nextPage = section.pages[pageIndex + 1];
  const previousPage = section.pages[pageIndex - 1];

  return {
    name,
    Component: page.default,
    data: page.data,
    next: (nextPage || nextSection) && {
      cta: nextPage ? 'Next' : nextSection.name.replace(/^\d+-/, ''),
      name: nextPage ? nextPage.data.name : nextSection.pages[0].data.name,
      slug: nextPage ? nextPage.name : nextSection.pages[0].name,
    },
    previous: (previousPage || previousSection) && {
      cta: previousPage ? 'Previous' : previousSection.name.replace(/^\d+-/, ''),
      name: previousPage
        ? previousPage.data.name
        : previousSection.pages[previousSection.pages.length - 1].data.name,
      slug: previousPage
        ? previousPage.name
        : previousSection.pages[previousSection.pages.length - 1].name,
    },
  };
};

export const App = (): JSX.Element => {
  const location = useLocation();
  const pageSlug = location.pathname;
  const page = getPage(pageSlug);

  return (
    <AnchorProvider>
      <RootLayout
        aside={
          page && (
            <nav aria-label="page">
              <VerticalStack gap={2}>
                <Heading look="h500" as="div">
                  Contents
                </Heading>
                {page.data.headings
                  .filter((heading) => heading.depth < 4)
                  .map((heading, index) => (
                    <ToAnchor depth={heading.depth} key={`${heading.text}-${index}`}>
                      {heading.text}
                    </ToAnchor>
                  ))}
              </VerticalStack>
            </nav>
          )
        }
        sidenav={
          <>
            {getSections().map((section, sectionIndex) => (
              <Section key={section.name} title={section.name.replace(/^\d+-/, '')}>
                {section.pages.map((page, pageIndex) => (
                  <LinkItem
                    aria-current={
                      location.pathname === `/${page.name}` ||
                      (location.pathname === '/' && sectionIndex === 0 && pageIndex === 0)
                        ? 'page'
                        : undefined
                    }
                    href={`/${page.name}`}
                    key={page.name}>
                    {page.data.name || titleCase(page.name)}
                  </LinkItem>
                ))}
              </Section>
            ))}
          </>
        }>
        <MDXProvider components={mdxComponents}>
          <ScrollTop key={pageSlug} />
          <PageTitle
            title={(page && page.data.headings[0].text) || (page && titleCase(page.name))}
          />

          {page && (
            <>
              <page.Component />

              <p css={{ margin: '8rem 0' }}>
                <a
                  target="_blank"
                  css={{
                    textDecoration: 'none',
                    borderRadius: 3,
                    color: colors.primary,
                    fontSize: 14,
                    opacity: 0.7,
                    fontWeight: 500,
                  }}
                  href={getEditUrl()}
                  rel="noreferrer">
                  <Text variant="aside" weight="bold">
                    Suggest changes to this page ➚
                  </Text>
                </a>
              </p>

              <div
                css={{
                  margin: '12rem 0 9rem',
                  display: 'flex',
                  '[data-next="true"]': {
                    marginLeft: 'auto',
                  },
                }}>
                {page.previous && (
                  <PageLink
                    direction="previous"
                    section={page.previous.cta}
                    to={`/${page.previous.slug}`}>
                    {page.previous.name || titleCase(page.previous.slug)}
                  </PageLink>
                )}

                {page.next && (
                  <PageLink direction="next" section={page.next.cta} to={`/${page.next.slug}`}>
                    {page.next.name || titleCase(page.next.slug)}
                  </PageLink>
                )}
              </div>
            </>
          )}
        </MDXProvider>
      </RootLayout>
    </AnchorProvider>
  );
};

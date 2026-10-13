"use client";

import * as React from "react";
import { Container } from "@/components/layout/container";
import { Section } from '@/components/layout/section';
import { SearchBar } from "@/components/layout/search-bar";

export const Hero: React.FC = () => {
  return (
    <Section>
      <Container size="xl">
        <div className="mx-auto flex w-full max-w-xl flex-col space-y-lg">
          <div className="space-y-xl">
            <h1 className="text-heading-lg font-heading leading-tight">
              Repair starts with access to the right part.
            </h1>
            <p className="text-body text-text-secondary">
              Common Parts Access is an open platform for publishing and accessing digital spare
              parts, built to keep everyday objects in use.
            </p>
          </div>

          <div>
            <SearchBar placeholder="Search a brand, product or reference..." className="w-full max-w-xl"/>
          </div>
        </div>
      </Container>
    </Section>
  );
};

"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/layout/container";
import { Section } from '@/components/layout/section';
import { SearchBar } from "@/components/layout/search-bar";

export const Hero: React.FC = () => {
  const t = useTranslations("Hero");
  return (
    <Section>
      <Container size="xl">
        <div className="mx-auto flex w-full max-w-xl flex-col space-y-lg">
          <div className="space-y-xl">
            <h1 className="text-heading-lg font-heading leading-tight">
              {t("title")}
            </h1>
            <p className="text-body text-text-secondary">{t("description")}</p>
          </div>

          <div>
            <SearchBar className="w-full max-w-xl"/>
          </div>
        </div>
      </Container>
    </Section>
  );
};

"use client";

import ReactMarkdown from "react-markdown";

type Props = {
  content: string;
};

export default function MarkdownContent({ content }: Props) {
  return (
    <div className="prose prose-sm prose-invert max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-pre:bg-zinc-900 prose-pre:text-zinc-300 prose-code:text-indigo-300 prose-code:before:content-[''] prose-code:after:content-['']">
      <ReactMarkdown
        skipHtml
        disallowedElements={["script", "iframe", "object", "embed", "form"]}
        unwrapDisallowed
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

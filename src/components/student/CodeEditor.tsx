import Editor from "@monaco-editor/react";

type Props = {
  code: string;
  onChange: (value: string) => void;
};

export default function CodeEditor({ code, onChange }: Props) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 bg-white">
      <Editor
        height="400px"
        language="python"
        value={code}
        theme="vs-dark"
        onChange={(value) => onChange(value ?? "")}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          automaticLayout: true,
          wordWrap: "on",
          lineNumbers: "on",
        }}
      />
    </div>
  );
}

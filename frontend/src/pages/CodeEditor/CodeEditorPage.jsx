import { useParams } from 'react-router-dom';

export const CodeEditorPage = () => {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Code Editor</h1>
      <p className="text-gray-500">Project ID: {id}</p>
    </div>
  );
};

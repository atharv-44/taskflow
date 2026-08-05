import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { updateTask, addComment } from '../store/slices/boardSlice';

export default function TaskModal({ task, onClose }) {
  const dispatch = useDispatch();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [newComment, setNewComment] = useState('');

  if (!task) return null;

  const handleUpdate = () => {
    if (title.trim() && (title !== task.title || description !== task.description)) {
      dispatch(updateTask({ taskId: task._id, taskData: { title, description } }));
    }
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    if (newComment.trim()) {
      dispatch(addComment({ taskId: task._id, text: newComment }));
      setNewComment('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="p-6 border-b flex justify-between items-start">
          <input
            className="text-2xl font-bold w-full border-none focus:ring-0 p-0"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleUpdate}
          />
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 p-2 text-xl">&times;</button>
        </div>
        
        <div className="p-6 flex-1 flex flex-col gap-6">
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Description</h3>
            <textarea
              className="w-full border rounded p-3 min-h-[100px]"
              placeholder="Add a more detailed description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleUpdate}
            />
          </div>

          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Activity</h3>
            <div className="space-y-4 mb-4">
              {(task.comments || []).map((comment, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold">
                    {comment.author?.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{comment.author?.name}</div>
                    <div className="text-gray-700 bg-gray-50 p-2 rounded mt-1">{comment.text}</div>
                  </div>
                </div>
              ))}
            </div>
            
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                placeholder="Write a comment..."
                className="flex-1 border rounded p-2"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Save</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  fetchBoard, 
  createColumn, 
  createTask, 
  optimisticMoveTask, 
  optimisticReorderColumn,
  moveTask,
  reorderColumn 
} from '../store/slices/boardSlice';
import TaskModal from '../components/TaskModal';

export default function Board() {
  const { projectId } = useParams();
  const dispatch = useDispatch();
  const { data: board, status } = useSelector((state) => state.board);
  const [newColName, setNewColName] = useState('');
  const [newTaskNames, setNewTaskNames] = useState({});
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    if (projectId) {
      dispatch(fetchBoard(projectId));
    }
  }, [projectId, dispatch]);

  const handleDragEnd = (result) => {
    const { source, destination, type } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (type === 'column') {
      const sourceIndex = source.index;
      const destIndex = destination.index;
      const cols = board.columns;
      
      let prevOrder = null;
      let nextOrder = null;

      if (destIndex === 0) {
        nextOrder = cols[0].order;
      } else if (destIndex === cols.length - 1) {
        prevOrder = cols[cols.length - 1].order;
      } else {
        const insertAfterIdx = destIndex > sourceIndex ? destIndex : destIndex - 1;
        prevOrder = cols[insertAfterIdx].order;
        nextOrder = cols[insertAfterIdx + 1].order;
      }

      let newOrder;
      if (prevOrder === null) newOrder = nextOrder / 2;
      else if (nextOrder === null) newOrder = prevOrder + 1;
      else newOrder = (prevOrder + nextOrder) / 2;

      const columnId = result.draggableId;
      dispatch(optimisticReorderColumn({ sourceIndex, destIndex, newOrder }));
      dispatch(reorderColumn({ columnId, prevOrder, nextOrder }));
      return;
    }

    if (type === 'task') {
      const sourceColId = source.droppableId;
      const destColId = destination.droppableId;
      const sourceIndex = source.index;
      const destIndex = destination.index;

      const sourceCol = board.columns.find(c => c._id === sourceColId);
      const destCol = board.columns.find(c => c._id === destColId);
      const taskId = result.draggableId;

      let prevOrder = null;
      let nextOrder = null;

      const destTasks = Array.from(destCol.tasks);
      if (sourceColId === destColId) {
        destTasks.splice(sourceIndex, 1);
      }

      if (destIndex === 0) {
        if (destTasks.length > 0) nextOrder = destTasks[0].order;
      } else if (destIndex >= destTasks.length) {
        if (destTasks.length > 0) prevOrder = destTasks[destTasks.length - 1].order;
      } else {
        prevOrder = destTasks[destIndex - 1].order;
        nextOrder = destTasks[destIndex].order;
      }

      let newOrder;
      if (prevOrder === null && nextOrder === null) newOrder = 1;
      else if (prevOrder === null) newOrder = nextOrder / 2;
      else if (nextOrder === null) newOrder = prevOrder + 1;
      else newOrder = (prevOrder + nextOrder) / 2;

      dispatch(optimisticMoveTask({ sourceColId, destColId, sourceIndex, destIndex, newOrder }));
      dispatch(moveTask({ taskId, targetColumnId: destColId, prevOrder, nextOrder }));
    }
  };

  const handleCreateColumn = (e) => {
    e.preventDefault();
    if (newColName.trim()) {
      dispatch(createColumn({ boardId: board._id, name: newColName }));
      setNewColName('');
    }
  };

  const handleCreateTask = (e, columnId) => {
    e.preventDefault();
    const title = newTaskNames[columnId];
    if (title?.trim()) {
      dispatch(createTask({ columnId, taskData: { title } }));
      setNewTaskNames({ ...newTaskNames, [columnId]: '' });
    }
  };

  if (status === 'loading' || !board) return <div className="p-4">Loading board...</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 bg-white border-b shadow-sm">
        <h2 className="text-xl font-bold">{board.name}</h2>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 bg-blue-50">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="board" type="column" direction="horizontal">
            {(provided) => (
              <div 
                className="flex gap-6 h-full items-start"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {board.columns.map((col, index) => (
                  <Draggable key={col._id} draggableId={col._id} index={index}>
                    {(provided) => (
                      <div 
                        className="bg-gray-100 rounded-lg shadow w-72 flex-shrink-0 flex flex-col max-h-full"
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        <div className="p-3 font-semibold text-gray-700 cursor-grab active:cursor-grabbing border-b">
                          {col.name} <span className="text-gray-400 text-sm font-normal ml-2">({col.tasks?.length || 0})</span>
                        </div>
                        
                        <Droppable droppableId={col._id} type="task">
                          {(provided) => (
                            <div 
                              className="p-2 flex-1 overflow-y-auto min-h-[50px]"
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                            >
                              {(col.tasks || []).map((task, index) => (
                                <Draggable key={task._id} draggableId={task._id} index={index}>
                                  {(provided) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      onClick={() => setSelectedTask(task)}
                                      className="bg-white p-3 rounded shadow-sm mb-2 cursor-pointer hover:shadow-md transition break-words"
                                    >
                                      {task.title}
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                        
                        <div className="p-2 border-t">
                          <form onSubmit={(e) => handleCreateTask(e, col._id)}>
                            <input
                              type="text"
                              placeholder="+ Add a card"
                              className="w-full p-2 bg-transparent rounded hover:bg-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                              value={newTaskNames[col._id] || ''}
                              onChange={(e) => setNewTaskNames({ ...newTaskNames, [col._id]: e.target.value })}
                            />
                          </form>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                
                <form onSubmit={handleCreateColumn} className="w-72 flex-shrink-0">
                  <input
                    type="text"
                    placeholder="+ Add another list"
                    className="w-full p-3 bg-white bg-opacity-50 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition font-semibold"
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                  />
                </form>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {selectedTask && (
        <TaskModal 
          task={board.columns.flatMap(c => c.tasks).find(t => t._id === selectedTask._id) || selectedTask} 
          onClose={() => setSelectedTask(null)} 
        />
      )}
    </div>
  );
}

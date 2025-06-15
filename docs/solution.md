1. Logic render cây theo lazy-loading: 

type TreeNode = {
  id: string;
  name: string;
  type: 'folder' | 'file';
  hasChildren: boolean;     // để biết có nên hiện dấu mũi tên mở rộng không
  children: TreeNode[];     // ban đầu là [], sau sẽ được cập nhật
};


const onExpandNode = async (nodeId: string) => {
  const response = await fetch(`/api/nodes?parentId=${nodeId}`);
  const children = await response.json(); // mảng node con

  setTreeData(prevTree => addChildrenToNode(prevTree, nodeId, children));
};

function addChildrenToNode(
  tree: TreeNode[],
  parentId: string,
  children: TreeNode[]
): TreeNode[] {
  return tree.map(node => {
    if (node.id === parentId) {
      return {
        ...node,
        children: children
      };
    }

    if (node.children.length > 0) {
      return {
        ...node,
        children: addChildrenToNode(node.children, parentId, children)
      };
    }

    return node;
  });
}


2. Logic render cây theo đệ quy 1 lần


<!-- Logic call API  -->
const fetchNodes = async (parentId: string | null): Promise<TreeNode[]> => {
  const res = await fetch(`/api/nodes?parentId=${parentId ?? ''}`);
  if (!res.ok) throw new Error('Failed to load nodes');
  return res.json();
};

// Hàm đệ quy để tải toàn bộ cây
const loadFullTreeRecursive = async (parentId: string | null = null): Promise<TreeNode[]> => {
  const nodes = await fetchNodes(parentId);

  // Đệ quy với từng node có children

  const wrappedPromises = nodes.map(async node => {
  try {
    const children = await loadFullTreeRecursive(node.id);
    return { ...node, children };
  } catch (err) {
    console.error('Error loading children of node', node.id, err);
    return { ...node, children: [], error: true }; // fallback
  }
});

  const result = await Promise.all(
    wrappedPromises
  );

  return result;
};

<!-- Logic setState bên front-end -->
const [treeData, setTreeData] = useState<TreeNode[]>([]);
const [loading, setLoading] = useState(false);

useEffect(() => {
  const loadTree = async () => {
    setLoading(true);
    try {
      const fullTree = await loadFullTreeRecursive(null); // bắt đầu từ root
      setTreeData(fullTree); // ✅ Cập nhật 1 lần duy nhất
    } catch (error) {
      console.error('Error loading full tree:', error);
    } finally {
      setLoading(false);
    }
  };

  loadTree();
}, []);




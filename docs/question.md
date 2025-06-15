1.Chỉ xem thư mục hiện tại, hoặc xem cả thư mục con (đệ quy) là nó có 2 cách để xem một cây đó là load 1 lượt hết luôn các thư mục, và 1 cách là mình sẽ ấn từng folder một và load từng cái ra ạ?

- Người dùng thì sẽ load từng cái một còn Root Admin sẽ load toàn bộ cây.

--------------------------------

2.Những folder, file mà user không có quyền thì sẽ không hiện lên cho user đó ở cây thư mục của họ, nhưng họ có thể tìm kiếm toàn văn những thư mục hiện có trên cây thư mục mà họ không có quyền, sau đó nếu họ muốn truy cập vào nó thì họ sẽ phải yêu cầu quyền truy cập đúng không 

-R12 – Phạm vi tìm kiếm:
  Cho phép tìm kiếm toàn văn và tiêu đề, trên toàn hệ thống (nghĩa là kể cả những thứ người dùng chưa có quyền).
- R13. Kết quả trả về: Chỉ trả về Tiêu đề tài liệu và trạng thái truy cập.
- Story 3.2 & 3.3:
  Khi người dùng thấy kết quả, nếu họ không có quyền, thì được phép nhấn để gửi yêu cầu truy cập.


--------------------------------

3. Làm sao để đóng các thư mục lại ( đóng thư mục cha thì các thư mục con cũng bị đóng theo) 
  - Ta sẽ sử dụng 1 hàm đệ quy để set isExpanded = false cho tất cả các node con
  function setExpandRecursively(tree: TreeNode[], expand: boolean): TreeNode[] {
    return tree.map((node) => ({
      ...node,
      isExpanded: expand,
      children: node.children ? setExpandRecursively(node.children, expand) : [],
    }));
  }

  VD: 
    -Khi muốn đóng toàn bộ cây:
      const handleCollapseAll = () => {
        setTree((prevTree) => setExpandRecursively(prevTree, false));
      };
    -Khi muốn mở toàn bộ cây: 
      const handleExpandAll = () => {
        setTree((prevTree) => setExpandRecursively(prevTree, true));
      }; 

    - Chỉ muốn đóng từ một node cụ thể:
    function updateNodeById(
      tree: TreeNode[],
      targetId: string,
      expand: boolean
    ): TreeNode[] {
      return tree.map((node) => {
        if (node.id === targetId) {
          return {
            ...node,
            isExpanded: expand,
            children: node.children
              ? setExpandRecursively(node.children, expand)
              : [],
          };
        }

        if (node.children) {
          return {
            ...node,
            children: updateNodeById(node.children, targetId, expand),
          };
        }

        return node;
      });
    }

4. Cách làm full-text search cho toàn bộ hệ thống. 
  - Tạo chỉ mục index trên các trường cần tìm : await this.nodeCollection.createIndex({ title: 'text', content: 'text' });
  - Truy vấn full-text:  const results = await this.nodeCollection.find({
                                  $text: { $search: 'từ khóa tìm kiếm' }
                              }).toArray();


5. Là một người dùng, khi yêu cầu quyền cho thư mục, tôi muốn chọn giữa 'Chỉ thư mục này' và 'Thư mục này và các thư mục con

  - Chỉ tạo 1 record permission cho user đó với node được yêu cầu:
    await permissionRepository.save({
      nodeId: folder.id,
      userId: requester.id,
      permission: 'VIEWER', // hoặc EDITOR
    });

  -Cả thư mục con (recursive):
  async function assignRecursivePermission(nodeId: string, userId: string, permission: PermissionLevel) {
    const node = await nodeRepository.findOne({ where: { id: nodeId }, relations: ['children'] });
    await permissionRepository.save({ nodeId, userId, permission });

    for (const child of node.children) {
      await assignRecursivePermission(child.id, userId, permission);
    }
  }

6. Làm sao để gửi email mỗi khi người dùng yêu cầu quyền truy cập với BullMQ + Redis + Brevo ? 
  1. Tạo email bằng BullMQ:
    // email.queue.ts
      import { Queue } from 'bullmq';
      import { redisConnection } from './redis-connection';

      export const emailQueue = new Queue('emailQueue', {
        connection: redisConnection,
      });
  2. Thêm job vào queue khi có yêu cầu
    // access-request.service.ts
    await emailQueue.add('send-email', {
      to: ownerEmail,
      subject: 'Yêu cầu quyền truy cập',
      html: `<p>Người dùng A đã yêu cầu quyền truy cập thư mục XYZ</p>`
    });

  3. Worker xử lý job
      // email.worker.ts
    import { Worker } from 'bullmq';
    import axios from 'axios';

    new Worker('emailQueue', async (job) => {
      const { to, subject, html } = job.data;

      // Gửi email bằng API của Brevo
      await axios.post('https://api.brevo.com/v3/smtp/email', {
        sender: { name: "Hệ thống", email: "no-reply@yourapp.com" },
        to: [{ email: to }],
        subject,
        htmlContent: html
      }, {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json'
        }
      });

      console.log(`Email sent to ${to}`);
    });

7. Cách dùng Swagger API 
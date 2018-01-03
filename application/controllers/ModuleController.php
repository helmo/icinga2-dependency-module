<?php
/*
* Icinga 2 Dependency Module
*
* naming scheme explanation: In order to call functions from frontend, a capital "Action"
* must be present at the end of every function, and there can be no other capitals or underscores in the exposed function name.
* 
* Additionally, functions are automatically routed by /module-name/name-of-controller/name-of-function
* 
*
* Finally each exposed function requires a .phmtl page of the same name to be present in the /scripts/views folder in order to 
* function, unless the function is terminated with 'exit'. this also means that any additional phtml page must have a 
* corresponding 'pageAction() {}' function in the module controller in order to be displayed.
*/



namespace Icinga\Module\dependency_plugin\Controllers;
use Icinga\Web\Controller;
use Icinga\Application\Config;
use Icinga\Data\Db\DbConnection as IcingaDbConnection;
use Icinga\Web\Widget\Tabextension\DashboardAction;
use Icinga\Data\ResourceFactory;
use Exception;

class ModuleController extends Controller{

    public function hierarchyAction() {

        $this->getTabs()->add('Network', array(
            'active'    => false,
            'label'     => $this->translate('Network Map'),
            'url'       => 'dependency_plugin/module/network'
        ));

        $this->getTabs()->add('Hierarchy', array(
            'active'    => true,
            'label'     => $this->translate('Hierarchy Map'),
            'url'       => 'dependency_plugin/module/hierarchy'
        ));
    }
    
    public function networkAction() {

        $this->getTabs()->add('Network', array(
            'active'    => true,
            'label'     => $this->translate('Network Map'),
            'url'       => 'dependency_plugin/module/network'
        ));

        $this->getTabs()->add('Hierarchy', array(
            'active'    => false,
            'label'     => $this->translate('Hierarchy Map'),
            'url'       => 'dependency_plugin/module/hierarchy'
        ));

    }

    public function kickstartAction() {

        $this->getTabs()->add('Kickstart', array(
            'active'    => true,
            'label'     => $this->translate('Kickstart'),
            'url'       => 'dependency_plugin/module/Kickstart'
        ));
    }

    public function welcomeAction() {

        $this->getTabs()->add('Welcome', array(
            'active'    => true,
            'label'     => $this->translate('Welcome'),
            'url'       => 'dependency_plugin/module/welcome'
        ));

    }

    public function settingsAction() {

        $this->getTabs()->add('Settings', array(
            'active'    => true,
            'label'     => $this->translate('Settings'),
            'url'       => 'dependency_plugin/module/settings'
        ));

    }
        
    public function homeAction() {

        $this->getTabs()->add('Network', array(
            'active'    => true,
            'label'     => $this->translate('Network Map'),
            'url'       => 'dependency_plugin/module/network'
        ));

        $this->getTabs()->add('Hierarchy', array(
            'active'    => false,
            'label'     => $this->translate('Hierarchy Map'),
            'url'       => 'dependency_plugin/module/hierarchy'
        ));

    }

    public function getresourcesAction(){
            
        $dbArr = [];
           
        $resourcesfile = fopen("/etc/icingaweb2/resources.ini", 'r'); //get icinga resources (databases)

        while($line = fgets($resourcesfile)) {

            if(strpos($line, '[') !== false){

                // echo $line;

                $dbname = explode('[', $line);
                $dbname = explode(']', $dbname[1]);
                array_push($dbArr, $dbname[0]);

            }

        }

        $resources['databases'] = $dbArr;
        
        echo json_encode($resources); 
        fclose($resourcesfile);
        
        exit;

    }

    function getResource() {
    
    try{
           
        $resourcesfile = fopen('/etc/icingaweb2/modules/dependency_plugin/config.ini', 'r'); //get icinga resources (databases)

    }catch(Exception $e){

        if(!file_exists('/etc/icingaweb2/modules/dependency_plugin/')){
 
        header('HTTP/1.1 500 Internal Server Error');
        header('Content-Type: application/json; charset=UTF-8');

        die(json_encode(array('message' => "Setup", 'code' => '500')));
 
    }

        header('HTTP/1.1 500 Internal Server Error');
        header('Content-Type: application/json; charset=UTF-8');
        die(json_encode(array('message' => $e->getMessage(), 'code' => '500')));


    }


        $dbname = [];

        while($line = fgets($resourcesfile)) {

            if(strpos($line, 'resource') !== false){

                $dbname = explode('=', $line);
                $dbname = explode('"', $dbname[1]);

            }

        }

        fclose($resourcesfile);
        
        return $dbname[1];

    }

    public function storeettingsAction(){

    //  this function uses a built-in icinga web function saveIni(); which automatically saves any passed data to 
    //  /etc/icingaweb2/modules/name-of-moudle/config.ini 

        $json = $_POST["json"];

        $data = json_decode($json, true);
        
        if($data != null){

                $resource = $data[0]['value'];
                $port = $data[1]['value'];
                $username = $data[2]['value'];
                $password = $data[3]['value'];

                $db = IcingaDbConnection::fromResourceName($resource)->getDbAdapter();

                $db->exec("TRUNCATE TABLE plugin_settings;"); //delete to only store latest settings 

                $res = $db->insert('plugin_settings', array(
                  'api_user' => $username, 
                  'api_password' => $password
                , 'api_endpoint' => $port
                ));

                $config = $this->config();
                $config->setSection('db', array('resource' => $resource));


                try {
                      $config->saveIni();
                    } catch (Exception $e) {


            echo $e->getMessage();
            exit;
        }

                if(!$res){
                echo "An error occured while attempting to store settings.\n";
                exit;
            }

                echo $res;

        }

        exit;

    }

    public function getdependencyAction() {

        try {

            $resource = $this->getResource();

            $db = IcingaDbConnection::fromResourceName($resource)->getDbAdapter();
            $query = 'SELECT * from plugin_settings';
            $vals = $db->fetchAll($query);
            if(!$vals){ //if no values
                throw new Exception('Empty Table'); //settings table empty
            }
        }
        catch(Exception $e){

                header('HTTP/1.1 500 Internal Server Error');
                header('Content-Type: application/json; charset=UTF-8');

                die(json_encode(array('message' => $e->getMessage(), 'code' => '500')));
        }

            $request_url = 'https://localhost:'. $vals[0]->api_endpoint . '/v1/objects/dependencies';
            $username = $vals[0]->api_user;
            $password = $vals[0]->api_password;
            $headers = array(
                'Accept: application/json',
                'X-HTTP-Method-Override: GET'
            );

            $ch = curl_init();

            curl_setopt_array($ch, array(

                CURLOPT_URL => $request_url,
                CURLOPT_HTTPHEADER => $headers,
                CURLOPT_USERPWD => $username . ":" . $password,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_SSL_VERIFYHOST => false,
            ));

            $response = curl_exec($ch);
            $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

            if($code === 401){ //echo detailed errors.
                header('HTTP/1.1 401 Unauthorized');
                header('Content-Type: application/json; charset=UTF-8');
                die(json_encode(array('message' => 'Unauthorized, Please Check Entered Credentials', 'code' => $code)));
            }else if($code != 200){
                header('HTTP/1.1 500 Internal Server Error');
                header('Content-Type: application/json; charset=UTF-8');
                die(json_encode(array('message' => curl_error($ch), 'code' => $code)));
            }

            echo $response;
            exit;

}

   public function gethostsAction(){

        try {

            $resource = $this->getResource();

            $db = IcingaDbConnection::fromResourceName($resource)->getDbAdapter();

            $query = 'SELECT * from plugin_settings';
            $vals = $db->fetchAll($query);

            if(!$vals){
                throw new Exception('Empty Table');
            
            }
        }
        catch(Exception $e){

                header('HTTP/1.1 500 Internal Server Error');
                header('Content-Type: application/json; charset=UTF-8');
                die(json_encode(array('message' => $e->getMessage(), 'code' => "500")));
        }

            $request_url = 'https://localhost:'. $vals[0]->api_endpoint . '/v1/objects/hosts';
            $username = $vals[0]->api_user;
            $password = $vals[0]->api_password;
            $headers = array(
                'Accept: application/json',
                'X-HTTP-Method-Override: GET'
            );

            $ch = curl_init();

            curl_setopt_array($ch, array(

                CURLOPT_URL => $request_url,
                CURLOPT_HTTPHEADER => $headers,
                CURLOPT_USERPWD => $username . ":" . $password,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_SSL_VERIFYHOST => false,
            ));

            $response = curl_exec($ch);

            $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

            if($code === 401){
                header('HTTP/1.1 401 Unauthorized');
                header('Content-Type: application/json; charset=UTF-8');
                die(json_encode(array('message' => 'Unauthorized, Please Check Entered Credentials', 'code' => $code)));
            }else if($code != 200){
                header('HTTP/1.1 500 Internal Server Error');
                header('Content-Type: application/json; charset=UTF-8');
                die(json_encode(array('message' => curl_error($ch), 'code' => $code)));
            } 
            echo $response;
            exit;


}

    public function storenodesAction(){

        $resource = $this->getResource();

        $db = IcingaDbConnection::fromResourceName($resource)->getDbAdapter();
         
        $json = $_POST["json"];

        $data = json_decode($json, true);

        if($data == 'RESET'){
            $db->exec("TRUNCATE TABLE node_positions;");
        }

        else if($data != null){

           $result = $db->exec("TRUNCATE TABLE node_positions;");

            foreach($data as $item){

                $name = $item['id'];
                $node_x = $item['x'];
                $node_y = $item['y'];

                echo(gettype($item['y']));

                $res = $db->insert('node_positions', array(
                    'node_name'=> $name, 'node_x' => $node_x, 'node_y' => $node_y
                ));


                if(!$res){
                echo "An error occured while attempting to store nodes.\n";
                exit;
            }

                echo $res;
            }

        }

        exit;
    }

    public function getnodesAction(){

        try {

            $resource = $this->getResource();

            $db = IcingaDbConnection::fromResourceName($resource)->getDbAdapter();

            $query = 'SELECT * from node_positions';
            $vals = $db->fetchAll($query);

            if(!$vals){
                    throw new Exception('Empty Table');
            }

        } catch(Exception $e){

            if($e-> getMessage() == 'Empty Table'){

                $json = json_encode('EMPTY!');

                echo $json;

                exit;

            } else {
                header('HTTP/1.1 500 Internal Server Error');
                header('Content-Type: application/json; charset=UTF-8');
                die(json_encode(array('message' => $e->getMessage(), 'code' => '500')));
            }
        }

            $json = json_encode($vals);

            echo $json;

            exit;
    }

    public function storegraphsettingsAction(){
    // For some reason in this function, icingas database manager 'IcingaDbConnection' will store and retrieve data 
    // based on whether the database is postgres or mysql, for example booleans for true and false are retrieved as
    // '1' and '' (empty string), due to reading the data using a php method to convert to strings on retrieval at 
    // some point, and integers are retrieved as strings for MySql, and actual ints for Postgres.

    //to get around this, every thing is cast as an integer to avoid going through php's toString function

        $json = $_POST["json"];

        $resource = $this->getResource();

        $data = json_decode($json, true);
        
        if($data != null){


                $db = IcingaDbConnection::fromResourceName($resource)->getDbAdapter();

                $db->exec("TRUNCATE TABLE graph_settings;");


                $res = $db->insert('graph_settings', array(
                  'default_network' => (int)$data['isHierarchical'], 
                  'display_up' => (int)$data['hostLabels']['up'],
                  'display_down' => (int) $data['hostLabels']['down'], 
                  'display_unreachable' => (int)$data['hostLabels']['unreachable'],
                  'display_only_dependencies' => (int)$data['displayOnlyDependencies'], 
                  'scaling' => (int)$data['scaling'], 
                  'always_display_large_labels' => (int)$data['labelLargeNodes'],
                  'alias_only' => (int)$data['aliasOnly'],
                  'text_size' => (int)$data['textSize']
                ));

            exit;
        }

                if(!$res){
                echo "An error occured while attempting to store settings.\n";
                exit;
            }

                echo $res;

        exit;

    }

    public function getgraphsettingsAction() {

        try {

            $resource = $this->getResource();

            $db = IcingaDbConnection::fromResourceName($resource)->getDbAdapter();

            $query = 'SELECT * from graph_settings';
            $vals = $db->fetchAll($query);

            if(!$vals){ //catch empty settings table
                   $db->insert('graph_settings', array( //insert default
                  'default_network' => 0, 
                  'display_up' => 1,
                  'display_down' => 1, 
                  'display_unreachable' => 1,
                  'display_only_dependencies' => 1, 
                  'scaling' => 1, 
                  'always_display_large_labels' => 1,
                  'alias_only' => 1,
                  'text_size' => 25
                ));

               $vals = $db->fetchAll($query);

            }
        } catch(Exception $e){

                header('HTTP/1.1 500 Internal Server Error');
                header('Content-Type: application/json; charset=UTF-8');
                die(json_encode(array('message' => $e->getMessage(), 'code' => '500')));
            }
        

            $json = json_encode($vals);

            echo $json;

            exit;
    }

    
}

?>